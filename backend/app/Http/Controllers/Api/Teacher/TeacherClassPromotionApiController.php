<?php

namespace App\Http\Controllers\Api\Teacher;

use App\Enums\UserRole;
use App\Http\Controllers\Controller;
use App\Models\ClassPromotion;
use App\Models\StudentPerformanceRecord;
use App\Models\StudentRecord;
use App\Models\User;
use App\Support\GradeScoring;
use App\Support\SchoolContextOptions;
use App\Support\UserNotificationCenter;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;

class TeacherClassPromotionApiController extends Controller
{
    public function status(Request $request): JsonResponse
    {
        $actor = $request->user();

        abort_unless($actor && $actor->isTeacher(), 403);

        $scope = $this->resolveScope($request, $actor);

        if ($scope['school_track'] === '' || $scope['class_name'] === '') {
            return response()->json([
                'school_track' => '',
                'class_name' => '',
                'next_class' => null,
                'is_last_class' => false,
                'pending' => null,
            ]);
        }

        $nextClass = SchoolContextOptions::nextClass(
            $scope['school_track'],
            $scope['class_name'],
            $actor->school_id,
        );

        $pending = ClassPromotion::query()
            ->where('school_id', $actor->school_id)
            ->where('school_track', $scope['school_track'])
            ->where('from_class', $scope['class_name'])
            ->where('status', ClassPromotion::STATUS_PENDING)
            ->latest('submitted_at')
            ->first();

        return response()->json([
            'school_track' => $scope['school_track'],
            'class_name' => $scope['class_name'],
            'from_class' => $scope['class_name'],
            'next_class' => $nextClass,
            'is_last_class' => $nextClass === null,
            'active_term_is_third' =>
                SchoolContextOptions::activeTerm($actor->school_id) === StudentPerformanceRecord::TERM_THIRD,
            'pending' => $pending ? $this->serialize($pending) : null,
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $actor = $request->user();

        abort_unless($actor && $actor->isTeacher(), 403);

        $activeTerm = SchoolContextOptions::activeTerm($actor->school_id);

        if ($activeTerm !== StudentPerformanceRecord::TERM_THIRD) {
            return response()->json([
                'message' => 'Promotions open at the end of the term. The school must activate the Third Term before a class can be promoted.',
            ], 422);
        }

        $scope = $this->resolveScope($request, $actor);

        if ($scope['school_track'] === '' || $scope['class_name'] === '') {
            return response()->json([
                'message' => 'Choose a class before submitting the promotion list.',
            ], 422);
        }

        $nextClass = SchoolContextOptions::nextClass(
            $scope['school_track'],
            $scope['class_name'],
            $actor->school_id,
        );

        if ($nextClass === null) {
            return response()->json([
                'message' => "{$scope['class_name']} is the highest class in this track. There is no next class to promote to.",
            ], 422);
        }

        $existingPromotion = ClassPromotion::query()
            ->where('school_id', $actor->school_id)
            ->where('school_track', $scope['school_track'])
            ->where('from_class', $scope['class_name'])
            ->where('status', ClassPromotion::STATUS_PENDING)
            ->latest('submitted_at')
            ->first();

        if ($existingPromotion) {
            return response()->json([
                'message' => 'A promotion request for this class is already awaiting the head teacher. Cancel or reject the existing request first.',
            ], 409);
        }

        $studentIds = collect($request->input('student_ids', []))
            ->map(fn ($value): int => (int) $value)
            ->filter(fn (int $id): bool => $id > 0)
            ->unique()
            ->values();

        if ($studentIds->isEmpty()) {
            return response()->json([
                'message' => 'Select at least one learner to promote.',
            ], 422);
        }

        $studentsInClass = StudentRecord::query()
            ->where('school_id', $actor->school_id)
            ->where('school_track', $scope['school_track'])
            ->where('class_name', $scope['class_name'])
            ->whereIn('id', $studentIds)
            ->get();

        if ($studentsInClass->isEmpty()) {
            return response()->json([
                'message' => 'None of the selected learners belong to this class.',
            ], 422);
        }

        $eligibleIds = $studentsInClass->pluck('id');
        $studentsInClass = $studentsInClass->filter(
            fn (StudentRecord $student): bool => $eligibleIds->contains($student->id),
        )->values();

        $averages = StudentPerformanceRecord::query()
            ->whereIn('student_record_id', $eligibleIds)
            ->whereIn('term', [
                StudentPerformanceRecord::TERM_FIRST,
                StudentPerformanceRecord::TERM_SECOND,
                StudentPerformanceRecord::TERM_THIRD,
            ])
            ->get(['student_record_id', 'term', 'subject_grades']);

        /** @var Collection<string, Collection<int, \App\Models\StudentPerformanceRecord>> $averagesByStudent */
        $averagesByStudent = $averages->groupBy('student_record_id');

        $snapshot = $studentsInClass->map(
            fn (StudentRecord $student): array => [
                'student_id' => $student->id,
                'full_name' => $student->full_name,
                'average' => $this->computeThreeTermAverage($averagesByStudent->get((string) $student->id)),
            ],
        )->values()->all();

        $promotion = ClassPromotion::query()->create([
            'school_id' => $actor->school_id,
            'teacher_id' => $actor->id,
            'teacher_name' => $actor->name,
            'school_track' => $scope['school_track'],
            'from_class' => $scope['class_name'],
            'to_class' => $nextClass,
            'status' => ClassPromotion::STATUS_PENDING,
            'students' => $snapshot,
            'submitted_at' => now(),
        ]);

        $this->notifyHeadTeachers($actor, $promotion);

        return response()->json([
            'message' => "{$studentsInClass->count()} learner(s) from {$scope['class_name']} submitted for promotion to {$nextClass}. The head teacher will review the list in the School Structure menu.",
            'promotion' => $this->serialize($promotion->fresh()),
        ], 201);
    }

    private function resolveScope(Request $request, User $actor): array
    {
        $requestedTrack = trim((string) $request->string('school_track'));
        $requestedClassName = trim((string) $request->string('class_name'));

        $lockedTrack = is_string($actor->school_track)
            ? trim($actor->school_track)
            : '';
        $lockedClassName = is_string($actor->assigned_class_name)
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
        ];
    }

    /**
     * @param  Collection<int, \App\Models\StudentPerformanceRecord>|null  $termRecords
     */
    private function computeThreeTermAverage(?Collection $termRecords): ?float
    {
        if (! $termRecords || $termRecords->isEmpty()) {
            return null;
        }

        $values = [];

        foreach ([StudentPerformanceRecord::TERM_FIRST, StudentPerformanceRecord::TERM_SECOND, StudentPerformanceRecord::TERM_THIRD] as $term) {
            $termAverage = GradeScoring::averageOfSubjectGrades(
                $termRecords
                    ->where('term', $term)
                    ->flatMap(fn (StudentPerformanceRecord $record): array => $record->subject_grades ?? [])
                    ->values()
                    ->all(),
            );

            if ($termAverage !== null) {
                $values[] = $termAverage;
            }
        }

        return GradeScoring::average($values);
    }

    private function notifyHeadTeachers(User $actor, ClassPromotion $promotion): void
    {
        $heads = User::query()
            ->where('school_id', $actor->school_id)
            ->where('role', UserRole::Management)
            ->get();

        foreach ($heads as $head) {
            UserNotificationCenter::createForUser(
                $head,
                'Promotion request',
                "{$promotion->teacher_name} submitted {$promotion->from_class} for promotion to {$promotion->to_class}. Review the learner list in the School Structure menu.",
                'info',
                '/management/school-structure',
            );
        }
    }

    /**
     * @return array<string, mixed>
     */
    private function serialize(ClassPromotion $promotion): array
    {
        return [
            'id' => $promotion->id,
            'school_track' => $promotion->school_track,
            'school_track_label' => SchoolContextOptions::tracks()[$promotion->school_track] ?? ucfirst($promotion->school_track),
            'from_class' => $promotion->from_class,
            'to_class' => $promotion->to_class,
            'status' => $promotion->status,
            'teacher_name' => $promotion->teacher_name,
            'students' => $promotion->students ?? [],
            'approved_student_ids' => $promotion->approved_student_ids ?? [],
            'submitted_at' => $promotion->submitted_at?->toIso8601String(),
            'approved_at' => $promotion->approved_at?->toIso8601String(),
        ];
    }
}