<?php

namespace App\Http\Controllers\Api\Management;

use App\Enums\UserRole;
use App\Enums\UserStatus;
use App\Http\Controllers\Controller;
use App\Http\Requests\Management\StoreTeacherSubjectAssignmentRequest;
use App\Models\SchoolSubject;
use App\Models\TeacherSubjectAssignment;
use App\Models\User;
use App\Support\SchoolContextOptions;
use Illuminate\Http\JsonResponse;

class ManagementTeacherSubjectAssignmentApiController extends Controller
{
    public function index(): JsonResponse
    {
        return response()->json([
            'assignments' => TeacherSubjectAssignment::query()
                ->with(['teacher:id,name,email,assigned_class_name,school_track,status', 'subject:id,name,code,school_track'])
                ->where('school_track', 'secondary')
                ->orderBy('class_name')
                ->orderBy('subject_id')
                ->get()
                ->map(fn (TeacherSubjectAssignment $assignment): array => $this->serializeAssignment($assignment))
                ->values(),
            'options' => $this->options(),
        ]);
    }

    public function store(StoreTeacherSubjectAssignmentRequest $request): JsonResponse
    {
        $assignment = TeacherSubjectAssignment::query()->create([
            'teacher_id' => $request->integer('teacher_id'),
            'subject_id' => $request->integer('subject_id'),
            'school_track' => 'secondary',
            'class_name' => $request->string('class_name')->toString(),
        ]);

        return response()->json([
            'message' => 'Subject teaching allocation created successfully.',
            'assignment' => $this->serializeAssignment(
                $assignment->fresh(['teacher:id,name,email,assigned_class_name,school_track,status', 'subject:id,name,code,school_track'])
            ),
            'options' => $this->options(),
        ], 201);
    }

    public function destroy(TeacherSubjectAssignment $assignment): JsonResponse
    {
        $assignment->delete();

        return response()->json([
            'message' => 'Subject teaching allocation removed successfully.',
            'options' => $this->options(),
        ]);
    }

    /**
     * @return array<string, mixed>
     */
    private function options(): array
    {
        return [
            'secondaryClasses' => SchoolContextOptions::classesByTrack(request()->user()?->school_id)['secondary'] ?? [],
            'teachers' => User::query()
                ->where('role', UserRole::Teacher)
                ->where('status', UserStatus::Active)
                ->where('school_track', 'secondary')
                ->orderBy('name')
                ->get()
                ->map(fn (User $teacher): array => [
                    'id' => $teacher->id,
                    'name' => $teacher->name,
                    'email' => $teacher->email,
                    'form_class_name' => $teacher->isFormTeacher() ? $teacher->assigned_class_name : null,
                    'teaching_roles' => $teacher->teachingRoles(),
                ])
                ->values(),
            'subjects' => SchoolSubject::query()
                ->where('school_track', 'secondary')
                ->orderBy('name')
                ->get()
                ->map(fn (SchoolSubject $subject): array => [
                    'id' => $subject->id,
                    'name' => $subject->name,
                    'code' => $subject->code,
                ])
                ->values(),
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function serializeAssignment(TeacherSubjectAssignment $assignment): array
    {
        return [
            'id' => $assignment->id,
            'school_track' => $assignment->school_track,
            'class_name' => $assignment->class_name,
            'teacher' => $assignment->teacher ? [
                'id' => $assignment->teacher->id,
                'name' => $assignment->teacher->name,
                'email' => $assignment->teacher->email,
                'form_class_name' => $assignment->teacher->isFormTeacher()
                    ? $assignment->teacher->assigned_class_name
                    : null,
                'teaching_roles' => $assignment->teacher->teachingRoles(),
            ] : null,
            'subject' => $assignment->subject ? [
                'id' => $assignment->subject->id,
                'name' => $assignment->subject->name,
                'code' => $assignment->subject->code,
            ] : null,
            'created_at' => $assignment->created_at?->toIso8601String(),
        ];
    }
}
