<?php

namespace App\Http\Controllers\Api\Teacher;

use App\Http\Controllers\Controller;
use App\Http\Requests\Teacher\UpsertStudentPerformanceRequest;
use App\Models\StudentPerformanceRecord;
use App\Models\StudentRecord;
use App\Models\User;
use App\Support\SchoolContextOptions;
use App\Support\UserNotificationCenter;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

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
                'performanceRecords' => fn ($query) => $query
                    ->where('teacher_id', $actor->id)
                    ->with('teacher:id,name'),
            ])
            ->orderBy('school_track')
            ->orderBy('class_name')
            ->orderBy('full_name')
            ->get();

        $serialized = $students->map(
            fn (StudentRecord $student): array => $this->serializeStudent($student),
        )->values();

        return response()->json([
            'students' => $serialized,
            'stats' => [
                'total_students' => $students->count(),
                'graded_students' => $serialized->whereNotNull('performance.grade')->count(),
                'pending_students' => $serialized->whereNull('performance.grade')->count(),
            ],
            'scope' => $scope,
            'options' => [
                'schoolTracks' => SchoolContextOptions::tracks(),
                'classesByTrack' => SchoolContextOptions::classesByTrack(),
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

        $record = StudentPerformanceRecord::query()->updateOrCreate(
            [
                'student_record_id' => $student->id,
                'teacher_id' => $actor->id,
            ],
            $request->validated(),
        );

        $student->loadMissing('guardians');

        foreach ($student->guardians as $guardian) {
            UserNotificationCenter::createForUser(
                $guardian,
                'New learner update available',
                "{$actor->name} uploaded a grade update for {$student->full_name}. Open your dashboard to review the latest comment and grade.",
                'info',
                '/dashboard',
            );
        }

        return response()->json([
            'message' => 'Learner grade record saved successfully.',
            'student' => $this->serializeStudent(
                $student->fresh([
                    'performanceRecords' => fn ($query) => $query
                        ->where('teacher_id', $actor->id)
                        ->with('teacher:id,name'),
                ]),
            ),
            'performance' => [
                'id' => $record->id,
                'grade' => $record->grade,
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
        $performance = $student->performanceRecords->first();

        return [
            'id' => $student->id,
            'full_name' => $student->full_name,
            'school_track' => $student->school_track,
            'school_track_label' => SchoolContextOptions::tracks()[$student->school_track] ?? ucfirst($student->school_track),
            'class_name' => $student->class_name,
            'student_code' => $student->student_code,
            'guardian_name' => $student->guardian_name,
            'sex' => $student->sex,
            'age' => $student->resolvedAge(),
            'performance' => $performance ? [
                'id' => $performance->id,
                'teacher_name' => $performance->teacher?->name ?? 'Teacher',
                'grade' => $performance->grade,
                'comment' => $performance->comment,
                'updated_at' => $performance->updated_at?->toIso8601String(),
            ] : null,
        ];
    }
}
