<?php

namespace App\Http\Controllers\Api\Management;

use App\Enums\UserRole;
use App\Enums\UserStatus;
use App\Http\Controllers\Controller;
use App\Http\Requests\Management\UpdateFormTeacherAllocationRequest;
use App\Models\User;
use App\Support\SchoolContextOptions;
use Illuminate\Http\JsonResponse;

class ManagementFormTeacherApiController extends Controller
{
    public function index(): JsonResponse
    {
        $teachers = User::query()
            ->where('role', UserRole::Teacher)
            ->where('school_track', 'secondary')
            ->orderBy('name')
            ->get()
            ->map(fn (User $teacher): array => $this->serializeTeacher($teacher))
            ->values();

        return response()->json([
            'teachers' => $teachers,
            'allocations' => $teachers
                ->filter(fn (array $teacher): bool => $teacher['is_form_teacher'])
                ->values(),
            'options' => [
                'secondaryClasses' => SchoolContextOptions::classesByTrack(request()->user()?->school_id)['secondary'] ?? [],
                'takenClasses' => SchoolContextOptions::takenClassesByTrack(null, request()->user()?->school_id)['secondary'] ?? [],
            ],
        ]);
    }

    public function update(UpdateFormTeacherAllocationRequest $request, User $teacher): JsonResponse
    {
        $teacher->update([
            'assigned_class_name' => $request->validated('assigned_class_name'),
        ]);

        return response()->json([
            'message' => $teacher->assigned_class_name
                ? 'Form teacher allocation updated successfully.'
                : 'Form teacher allocation cleared successfully.',
            'teacher' => $this->serializeTeacher($teacher->fresh()),
            'options' => [
                'secondaryClasses' => SchoolContextOptions::classesByTrack($request->user()?->school_id)['secondary'] ?? [],
                'takenClasses' => SchoolContextOptions::takenClassesByTrack($teacher->fresh(), $request->user()?->school_id)['secondary'] ?? [],
            ],
        ]);
    }

    /**
     * @return array<string, mixed>
     */
    private function serializeTeacher(User $teacher): array
    {
        return [
            'id' => $teacher->id,
            'name' => $teacher->name,
            'email' => $teacher->email,
            'status' => $teacher->status?->value ?? $teacher->status,
            'status_label' => $teacher->status?->label() ?? (string) $teacher->status,
            'school_track' => $teacher->school_track,
            'assigned_class_name' => $teacher->assigned_class_name,
            'form_class_name' => $teacher->isFormTeacher() ? $teacher->assigned_class_name : null,
            'is_form_teacher' => $teacher->isFormTeacher(),
            'teaching_roles' => $teacher->teachingRoles(),
            'can_receive_form_class' => $teacher->status === UserStatus::Active,
        ];
    }
}
