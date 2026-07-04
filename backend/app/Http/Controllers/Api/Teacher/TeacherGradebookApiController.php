<?php

namespace App\Http\Controllers\Api\Teacher;

use App\Http\Controllers\Controller;
use App\Http\Requests\Teacher\UpsertStudentPerformanceRequest;
use App\Models\GradeAssessmentPeriod;
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

        $students = StudentRecord::query()
            ->where('school_id', $actor->school_id)
            ->when($scope['school_track'] !== '', fn ($query) => $query->where('school_track', $scope['school_track']))
            ->when($scope['class_name'] !== '', fn ($query) => $query->where('class_name', $scope['class_name']))
            ->with([
                'performanceRecords' => fn ($query) => $query->with([
                    'teacher:id,name',
                    'assessmentPeriod:id,name,position',
                ]),
            ])
            ->orderBy('school_track')
            ->orderBy('class_name')
            ->orderBy('full_name')
            ->get();

        $serialized = $students->map(
            fn (StudentRecord $student): array => $this->serializeStudent($student),
        )->values();

        $subjectsByTrack = SchoolSubject::query()
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
                'classesByTrack' => SchoolContextOptions::classesByTrack(),
                'subjectsByTrack' => $subjectsByTrack,
                'assessmentPeriods' => $assessmentPeriods,
                'registerScheduleByTrack' => SchoolContextOptions::registerScheduleByTrack(),
            ],
        ]);
    }

    public function upsert(
        UpsertStudentPerformanceRequest $request,
        StudentRecord $student,
    ): JsonResponse {
        $actor = $request->user();

        abort_unless($actor && ($actor->isTeacher() || $actor->canManageTimetables()), 403);

        if (! $this->studentIsAccessibleToActor($student, $actor)) {
            abort(404);
        }

        $validated = $request->validated();
        $assessmentPeriod = GradeAssessmentPeriod::query()->findOrFail(
            (int) $validated['assessment_period_id'],
        );
        $subjectGrades = $this->normalizeSubjectGrades(
            $validated['subject_grades'] ?? [],
            $student->school_track,
        );

        $record = StudentPerformanceRecord::query()->updateOrCreate(
            [
                'student_record_id' => $student->id,
                'assessment_period_id' => $assessmentPeriod->id,
            ],
            [
                'teacher_id' => $actor->id,
                'grade' => $this->buildGradeSummary($subjectGrades),
                'subject_grades' => $subjectGrades,
                'comment' => $validated['comment'] ?? null,
            ],
        );

        $student->loadMissing('guardians');

        foreach ($student->guardians as $guardian) {
            UserNotificationCenter::createForUser(
                $guardian,
                'New learner update available',
                "{$actor->name} uploaded {$assessmentPeriod->name} subject grades for {$student->full_name}. Open your dashboard to review the latest comment and scores.",
                'info',
                '/dashboard',
            );
        }

        return response()->json([
            'message' => 'Learner grade record saved successfully.',
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
                'assessment_period_name' => $assessmentPeriod->name,
                'grade' => $record->grade,
                'grade_summary' => $record->grade,
                'subject_grades' => $record->subject_grades ?? [],
                'comment' => $record->comment,
                'updated_at' => $record->updated_at?->toIso8601String(),
            ],
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

        if ($className !== '' && $track !== '' && ! SchoolContextOptions::isValidClassForTrack($track, $className)) {
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
                '%05d-%s',
                (int) ($record->assessmentPeriod?->position ?? PHP_INT_MAX),
                (string) ($record->assessmentPeriod?->name ?? ''),
            ))
            ->values()
            ->map(fn (StudentPerformanceRecord $performance): array => [
                'id' => $performance->id,
                'assessment_period_id' => $performance->assessment_period_id,
                'assessment_period_name' => $performance->assessmentPeriod?->name ?? 'General',
                'teacher_name' => $performance->teacher?->name ?? 'Teacher',
                'grade' => $performance->grade,
                'grade_summary' => $performance->grade,
                'subject_grades' => $performance->subject_grades ?? [],
                'comment' => $performance->comment,
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
                'assessment_period_name' => $latestPerformance->assessmentPeriod?->name ?? 'General',
                'teacher_name' => $latestPerformance->teacher?->name ?? 'Teacher',
                'grade' => $latestPerformance->grade,
                'grade_summary' => $latestPerformance->grade,
                'subject_grades' => $latestPerformance->subject_grades ?? [],
                'comment' => $latestPerformance->comment,
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

    /**
     * @param  array<int, array<string, mixed>>  $submittedSubjectGrades
     * @return array<int, array<string, mixed>>
     */
    private function normalizeSubjectGrades(
        array $submittedSubjectGrades,
        string $schoolTrack,
    ): array {
        $gradesBySubjectId = collect($submittedSubjectGrades)
            ->keyBy(fn (array $entry): int => (int) $entry['subject_id']);

        return SchoolSubject::query()
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
}
