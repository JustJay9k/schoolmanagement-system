<?php

namespace App\Http\Controllers\Api\Teacher;

use App\Http\Controllers\Controller;
use App\Http\Requests\Teacher\UpsertStudentPerformanceRequest;
use App\Models\GradeAssessmentPeriod;
use App\Models\RegisterReport;
use App\Models\SchoolSubject;
use App\Models\StudentPerformanceRecord;
use App\Models\StudentRecord;
use App\Models\User;
use App\Support\SchoolContextOptions;
use App\Support\UserNotificationCenter;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;

class TeacherGradebookApiController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $actor = $request->user();

        abort_unless($actor && ($actor->isTeacher() || $actor->canManageTimetables()), 403);

        $scope = $this->resolveScope($request, $actor);

        if ($actor->canManageTimetables()) {
            $students = StudentRecord::query()
                ->where('school_id', $actor->school_id)
                ->when($scope['school_track'] !== '', fn ($query) => $query->where('school_track', $scope['school_track']))
                ->when($scope['class_name'] !== '', fn ($query) => $query->where('class_name', $scope['class_name']))
                ->with([
                    'performanceRecords' => fn ($query) => $query
                        ->visibleToHeadTeacher()
                        ->with([
                            'teacher:id,name',
                            'assessmentPeriod:id,name,position',
                        ]),
                ])
                ->orderBy('school_track')
                ->orderBy('class_name')
                ->orderBy('full_name')
                ->get();
        } else {
            $students = StudentRecord::query()
                ->where('school_id', $actor->school_id)
                ->when($scope['school_track'] !== '', fn ($query) => $query->where('school_track', $scope['school_track']))
                ->when($scope['class_name'] !== '', fn ($query) => $query->where('class_name', $scope['class_name']))
                ->with([
                    'performanceRecords' => fn ($query) => $query
                        ->with([
                            'teacher:id,name',
                            'assessmentPeriod:id,name,position',
                        ]),
                ])
                ->orderBy('school_track')
                ->orderBy('class_name')
                ->orderBy('full_name')
                ->get();
        }

        $serialized = $students->map(
            fn (StudentRecord $student): array => $this->serializeStudent($student),
        )->values();

        $subjectsByTrack = SchoolSubject::query()
            ->where('school_id', $actor->school_id)
            ->orderBy('school_track')
            ->orderBy('name')
            ->get(['id', 'name', 'code', 'school_track'])
            ->groupBy('school_track')
            ->map(
                fn (Collection $subjects) => $subjects->map(
                    fn (SchoolSubject $subject): array => [
                        'id' => $subject->id,
                        'name' => $subject->name,
                        'code' => $subject->code,
                    ],
                )->values(),
            );

        $assessmentPeriods = GradeAssessmentPeriod::query()
            ->where('school_id', $actor->school_id)
            ->orderBy('position')
            ->orderBy('name')
            ->get(['id', 'name', 'position'])
            ->map(fn (GradeAssessmentPeriod $period): array => [
                'id' => $period->id,
                'name' => $period->name,
                'position' => $period->position,
            ])
            ->values();

        $currentRegisterReport = null;

        if ($actor->isTeacher() && $scope['school_track'] !== '' && $scope['class_name'] !== '') {
            $currentRegisterReport = RegisterReport::query()
                ->where('school_id', $actor->school_id)
                ->where('teacher_id', $actor->id)
                ->where('school_track', $scope['school_track'])
                ->where('class_name', $scope['class_name'])
                ->whereDate('report_date', now()->toDateString())
                ->latest('updated_at')
                ->first();
        }

        return response()->json([
            'students' => $serialized,
            'stats' => [
                'total_students' => $students->count(),
                'graded_students' => $serialized->filter(
                    fn (array $student): bool => $this->studentHasSavedGrades($student),
                )->count(),
                'pending_students' => $serialized->reject(
                    fn (array $student): bool => $this->studentHasSavedGrades($student),
                )->count(),
            ],
            'scope' => $scope,
            'options' => [
                'schoolTracks' => SchoolContextOptions::tracks(),
                'classesByTrack' => SchoolContextOptions::classesByTrack($actor->school_id),
                'subjectsByTrack' => $subjectsByTrack,
                'assessmentPeriods' => $assessmentPeriods,
                'registerScheduleByTrack' => SchoolContextOptions::registerScheduleByTrack(),
                'activeTerm' => SchoolContextOptions::activeTerm($actor->school_id),
            ],
            'registerReport' => $currentRegisterReport ? [
                'id' => $currentRegisterReport->id,
                'school_track' => $currentRegisterReport->school_track,
                'class_name' => $currentRegisterReport->class_name,
                'report_date' => $currentRegisterReport->report_date?->toDateString(),
                'status' => $currentRegisterReport->status,
                'submitted_at' => $currentRegisterReport->submitted_at?->toIso8601String(),
                'periods' => $currentRegisterReport->periods ?? [],
                'entries' => $currentRegisterReport->entries ?? [],
                'summary' => $currentRegisterReport->summary ?? null,
            ] : null,
        ]);
    }

    public function upsert(
        UpsertStudentPerformanceRequest $request,
        StudentRecord $student,
    ): JsonResponse {
        $actor = $request->user();

        abort_unless($actor && $actor->isTeacher(), 403);

        if (! $this->studentIsAccessibleToActor($student, $actor)) {
            abort(404);
        }

        $validated = $request->validated();
        $term = $validated['term'];

        $activeTerm = SchoolContextOptions::activeTerm($student->school_id);

        if ($term !== $activeTerm) {
            abort(422, 'Grades can only be entered for the active term (' . $this->termLabel($activeTerm) . ').');
        }

        $assessmentPeriod = GradeAssessmentPeriod::query()->findOrFail(
            (int) $validated['assessment_period_id'],
        );
        $subjectGrades = $this->normalizeSubjectGrades(
            $validated['subject_grades'] ?? [],
            $student->school_track,
            $student->school_id,
        );

        $record = StudentPerformanceRecord::query()
            ->where('student_record_id', $student->id)
            ->where('assessment_period_id', $assessmentPeriod->id)
            ->where('term', $term)
            ->first();

        if ($record && $record->status !== StudentPerformanceRecord::STATUS_DRAFT) {
            abort(422, 'This grade has already been submitted and is awaiting approval. Ask the head teacher to reopen grading before editing.');
        }

        $record = StudentPerformanceRecord::query()->updateOrCreate(
            [
                'student_record_id' => $student->id,
                'assessment_period_id' => $assessmentPeriod->id,
                'term' => $term,
            ],
            [
                'teacher_id' => $actor->id,
                'grade' => $this->buildGradeSummary($subjectGrades),
                'subject_grades' => $subjectGrades,
                'comment' => $validated['comment'] ?? null,
                'status' => StudentPerformanceRecord::STATUS_DRAFT,
            ],
        );

        return response()->json([
            'message' => 'Learner grade draft saved successfully. Submit the grades to publish them to school leadership.',
            'student' => $this->serializeStudent(
                $student->fresh([
                    'performanceRecords' => fn ($query) => $query->with([
                        'teacher:id,name',
                        'assessmentPeriod:id,name,position',
                    ]),
                ]),
            ),
            'performance' => [
                'id' => $record->id,
                'assessment_period_id' => $record->assessment_period_id,
                'assessment_period_term' => $record->term,
                'assessment_period_term_label' => $this->termLabel($record->term),
                'assessment_period_name' => $assessmentPeriod->name,
                'grade' => $record->grade,
                'grade_summary' => $record->grade,
                'subject_grades' => $record->subject_grades ?? [],
                'comment' => $record->comment,
                'status' => $record->status,
                'updated_at' => $record->updated_at?->toIso8601String(),
            ],
        ]);
    }

    public function submit(Request $request): JsonResponse
    {
        $actor = $request->user();

        abort_unless($actor && $actor->isTeacher(), 403);

        $scope = $this->resolveScope($request, $actor);

        if ($scope['school_track'] === '' || $scope['class_name'] === '') {
            return response()->json([
                'message' => 'Choose a class before submitting learner grades.',
            ], 422);
        }

        $studentsInScope = StudentRecord::query()
            ->where('school_id', $actor->school_id)
            ->where('school_track', $scope['school_track'])
            ->where('class_name', $scope['class_name'])
            ->get(['id', 'full_name', 'school_track']);

        $periodIds = GradeAssessmentPeriod::query()
            ->where('school_id', $actor->school_id)
            ->pluck('id');

        $missingStudents = [];

        $activeTerm = SchoolContextOptions::activeTerm($actor->school_id);

        foreach ($studentsInScope as $student) {
            foreach ($periodIds as $periodId) {
                $record = StudentPerformanceRecord::query()
                    ->where('student_record_id', $student->id)
                    ->where('assessment_period_id', $periodId)
                    ->where('term', $activeTerm)
                    ->first();

                if (! $record || ! $this->hasCompleteSubjectGrades($record->subject_grades, $student->school_track, $actor->school_id)) {
                    $missingStudents[] = $student->full_name;
                    break;
                }
            }
        }

        if (count($missingStudents) > 0) {
            $preview = implode(', ', array_slice($missingStudents, 0, 5));
            $extra = count($missingStudents) > 5
                ? ' and ' . (count($missingStudents) - 5) . ' more learner(s)'
                : '';

            return response()->json([
                'message' => "Grades are still missing for {$preview}{$extra}. Fill in every subject grade for all learners before submitting.",
            ], 422);
        }

        $records = StudentPerformanceRecord::query()
            ->whereHas('student', function ($query) use ($actor, $scope): void {
                $query
                    ->where('school_id', $actor->school_id)
                    ->where('school_track', $scope['school_track'])
                    ->where('class_name', $scope['class_name']);
            })
            ->where('term', $activeTerm)
            ->draft()
            ->get();

        if ($records->isEmpty()) {
            return response()->json([
                'message' => 'There are no draft grades to submit for this class yet. Save grades first, then submit them.',
            ], 422);
        }

        StudentPerformanceRecord::query()
            ->whereIn('id', $records->pluck('id'))
            ->update(['status' => StudentPerformanceRecord::STATUS_SUBMITTED]);

        return response()->json([
            'message' => "{$records->count()} grade record(s) submitted successfully. They will only be visible to guardians once the head teacher approves them.",
            'submitted_count' => $records->count(),
        ]);
    }

    public function approve(Request $request): JsonResponse
    {
        $actor = $request->user();

        abort_unless($actor && $actor->canManageTimetables(), 403);

        $scope = $this->resolveScope($request, $actor);

        if ($scope['school_track'] === '' || $scope['class_name'] === '') {
            return response()->json([
                'message' => 'Choose a class before approving learner grades.',
            ], 422);
        }

        $records = StudentPerformanceRecord::query()
            ->whereHas('student', function ($query) use ($actor, $scope): void {
                $query
                    ->where('school_id', $actor->school_id)
                    ->where('school_track', $scope['school_track'])
                    ->where('class_name', $scope['class_name']);
            })
            ->submitted()
            ->get();

        if ($records->isEmpty()) {
            return response()->json([
                'message' => 'There are no submitted grades waiting for approval in this class.',
            ], 422);
        }

        $approvedStudents = $records
            ->loadMissing('student', 'assessmentPeriod:id,name')
            ->groupBy('student_record_id');

        StudentPerformanceRecord::query()
            ->whereIn('id', $records->pluck('id'))
            ->update(['status' => StudentPerformanceRecord::STATUS_APPROVED]);

        foreach ($approvedStudents as $studentId => $group) {
            $student = $group->first()->student;

            $periodNames = $group
                ->map(fn ($record) => $record->assessmentPeriod?->name ?? 'General')
                ->unique()
                ->values()
                ->implode(', ');

            foreach ($student->guardians as $guardian) {
                UserNotificationCenter::createForUser(
                    $guardian,
                    'Learner results approved',
                    "Your ward's {$periodNames} grades for {$student->full_name} have been approved and are now available. Open your dashboard to review the scores and position.",
                    'info',
                    '/dashboard',
                );
            }
        }

        return response()->json([
            'message' => "{$records->count()} grade record(s) approved and published to guardians.",
            'approved_count' => $records->count(),
        ]);
    }

    public function reopen(Request $request): JsonResponse
    {
        $actor = $request->user();

        abort_unless($actor && $actor->canManageTimetables(), 403);

        $scope = $this->resolveScope($request, $actor);

        if ($scope['school_track'] === '' || $scope['class_name'] === '') {
            return response()->json([
                'message' => 'Choose a class before reopening grades.',
            ], 422);
        }

        $records = StudentPerformanceRecord::query()
            ->whereHas('student', function ($query) use ($actor, $scope): void {
                $query
                    ->where('school_id', $actor->school_id)
                    ->where('school_track', $scope['school_track'])
                    ->where('class_name', $scope['class_name']);
            })
            ->whereIn('status', [
                StudentPerformanceRecord::STATUS_SUBMITTED,
                StudentPerformanceRecord::STATUS_APPROVED,
            ])
            ->get();

        if ($records->isEmpty()) {
            return response()->json([
                'message' => 'There are no submitted or approved grades to reopen in this class.',
            ], 422);
        }

        StudentPerformanceRecord::query()
            ->whereIn('id', $records->pluck('id'))
            ->update(['status' => StudentPerformanceRecord::STATUS_DRAFT]);

        return response()->json([
            'message' => "{$records->count()} grade record(s) returned to draft. The teacher can now edit and submit them again.",
            'reopened_count' => $records->count(),
        ]);
    }

    /**
     * @return array<string, mixed>
     */
    private function resolveScope(Request $request, User $actor): array
    {
        $requestedTrack = trim((string) $request->string('school_track'));
        $requestedClassName = trim((string) $request->string('class_name'));

        $lockedTrack = $actor->isTeacher() && is_string($actor->school_track)
            ? trim($actor->school_track)
            : '';
        $lockedClassName = $actor->isTeacher() && is_string($actor->assigned_class_name)
            ? trim($actor->assigned_class_name)
            : '';

        $track = $lockedTrack !== '' ? $lockedTrack : $requestedTrack;
        $className = $lockedClassName !== '' ? $lockedClassName : $requestedClassName;

        if ($track !== '' && ! in_array($track, SchoolContextOptions::trackValues(), true)) {
            $track = '';
        }

        if ($className !== '' && $track !== '' && ! SchoolContextOptions::isValidClassForTrack($track, $className, $actor->school_id)) {
            $className = '';
        }

        return [
            'school_track' => $track,
            'class_name' => $className,
            'locked_track' => $lockedTrack,
            'locked_class_name' => $lockedClassName,
        ];
    }

    private function studentIsAccessibleToActor(StudentRecord $student, User $actor): bool
    {
        if ($student->school_id !== $actor->school_id) {
            return false;
        }

        if ($actor->canManageTimetables()) {
            return true;
        }

        if ($actor->school_track && $student->school_track !== $actor->school_track) {
            return false;
        }

        if ($actor->assigned_class_name && $student->class_name !== $actor->assigned_class_name) {
            return false;
        }

        return true;
    }

    /**
     * @return array<string, mixed>
     */
    private function serializeStudent(StudentRecord $student): array
    {
        $performances = $student->performanceRecords
            ->sortBy(fn (StudentPerformanceRecord $record): string => sprintf(
                '%02d-%05d-%s',
                $this->termSortOrder($record->term),
                (int) ($record->assessmentPeriod?->position ?? PHP_INT_MAX),
                (string) ($record->assessmentPeriod?->name ?? ''),
            ))
            ->values()
            ->map(fn (StudentPerformanceRecord $performance): array => [
                'id' => $performance->id,
                'assessment_period_id' => $performance->assessment_period_id,
                'assessment_period_term' => $performance->term,
                'assessment_period_term_label' => $this->termLabel($performance->term),
                'assessment_period_name' => $performance->assessmentPeriod?->name ?? 'General',
                'teacher_name' => $performance->teacher?->name ?? 'Teacher',
                'grade' => $performance->grade,
                'grade_summary' => $performance->grade,
                'subject_grades' => $performance->subject_grades ?? [],
                'comment' => $performance->comment,
                'status' => $performance->status,
                'updated_at' => $performance->updated_at?->toIso8601String(),
            ]);

        $latestPerformance = $student->performanceRecords
            ->sortByDesc(fn (StudentPerformanceRecord $record): string => (string) $record->updated_at)
            ->first();

        return [
            'id' => $student->id,
            'full_name' => $student->full_name,
            'school_track' => $student->school_track,
            'school_track_label' => SchoolContextOptions::tracks()[$student->school_track] ?? ucfirst($student->school_track),
            'class_name' => $student->class_name,
            'student_code' => $student->student_code,
            'guardian_name' => $student->guardian_name,
            'disability_name' => $student->disability_name,
            'sex' => $student->sex,
            'date_of_birth' => $student->date_of_birth?->format('Y-m-d'),
            'age' => $student->resolvedAge(),
            'performance' => $latestPerformance ? [
                'id' => $latestPerformance->id,
                'assessment_period_id' => $latestPerformance->assessment_period_id,
                'assessment_period_term' => $latestPerformance->term,
                'assessment_period_term_label' => $this->termLabel($latestPerformance->term),
                'assessment_period_name' => $latestPerformance->assessmentPeriod?->name ?? 'General',
                'teacher_name' => $latestPerformance->teacher?->name ?? 'Teacher',
                'grade' => $latestPerformance->grade,
                'grade_summary' => $latestPerformance->grade,
                'subject_grades' => $latestPerformance->subject_grades ?? [],
                'comment' => $latestPerformance->comment,
                'status' => $latestPerformance->status,
                'updated_at' => $latestPerformance->updated_at?->toIso8601String(),
            ] : null,
            'performances' => $performances,
        ];
    }

    private function studentHasSavedGrades(array $student): bool
    {
        $performances = $student['performances'] ?? [];

        return is_array($performances) && count($performances) > 0;
    }

    private function termSortOrder(?string $term): int
    {
        return match ($term) {
            StudentPerformanceRecord::TERM_FIRST => 1,
            StudentPerformanceRecord::TERM_SECOND => 2,
            StudentPerformanceRecord::TERM_THIRD => 3,
            default => 4,
        };
    }

    private function termLabel(?string $term): string
    {
        return $term && isset(StudentPerformanceRecord::termLabels()[$term])
            ? StudentPerformanceRecord::termLabels()[$term]
            : 'First Term';
    }

    /**
     * @param  array<int, array<string, mixed>>  $submittedSubjectGrades
     * @return array<int, array<string, mixed>>
     */
    private function normalizeSubjectGrades(
        array $submittedSubjectGrades,
        string $schoolTrack,
        ?int $schoolId,
    ): array {
        $gradesBySubjectId = collect($submittedSubjectGrades)
            ->keyBy(fn (array $entry): int => (int) $entry['subject_id']);

        return SchoolSubject::query()
            ->where('school_id', $schoolId)
            ->where('school_track', $schoolTrack)
            ->orderBy('name')
            ->get(['id', 'name', 'code'])
            ->map(function (SchoolSubject $subject) use ($gradesBySubjectId): array {
                $submittedGrade = $gradesBySubjectId->get($subject->id);

                return [
                    'subject_id' => $subject->id,
                    'subject_name' => $subject->name,
                    'subject_code' => $subject->code,
                    'grade' => is_array($submittedGrade)
                        ? trim((string) ($submittedGrade['grade'] ?? ''))
                        : '',
                    'remarks' => is_array($submittedGrade)
                        ? trim((string) ($submittedGrade['remarks'] ?? ''))
                        : '',
                ];
            })
            ->values()
            ->all();
    }

    /**
     * @param  array<int, array<string, mixed>>  $subjectGrades
     */
    private function buildGradeSummary(array $subjectGrades): string
    {
        if (count($subjectGrades) === 0) {
            return 'No subject grades saved';
        }

        $segments = collect($subjectGrades)
            ->take(2)
            ->map(function (array $subjectGrade): string {
                $name = trim((string) ($subjectGrade['subject_name'] ?? 'Subject'));
                $grade = trim((string) ($subjectGrade['grade'] ?? ''));

                return "{$name}: {$grade}";
            })
            ->values();

        $remaining = count($subjectGrades) - $segments->count();

        if ($remaining > 0) {
            $segments->push("+{$remaining} more");
        }

        return $segments->implode('; ');
    }

    /**
     * @param  array<int, array<string, mixed>>|null  $subjectGrades
     */
    private function hasCompleteSubjectGrades(?array $subjectGrades, string $schoolTrack, ?int $schoolId): bool
    {
        if (empty($subjectGrades)) {
            return false;
        }

        $gradesBySubject = collect($subjectGrades)
            ->keyBy(fn (array $entry): int => (int) $entry['subject_id']);

        return SchoolSubject::query()
            ->where('school_id', $schoolId)
            ->where('school_track', $schoolTrack)
            ->get('id')
            ->every(fn ($subject): bool => trim((string) ($gradesBySubject->get($subject->id)['grade'] ?? '')) !== '');
    }
}
