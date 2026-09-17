<?php

namespace App\Http\Controllers\Api\Management;

use App\Enums\UserRole;
use App\Enums\UserStatus;
use App\Http\Controllers\Controller;
use App\Http\Requests\Management\UpdateFormTeacherAllocationRequest;
use App\Models\User;
use App\Support\SchoolContextOptions;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ManagementFormTeacherApiController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $schoolId = $request->user()?->school_id;
        $enabledTracks = SchoolContextOptions::enabledTracks($schoolId);
        $teachers = User::query()
            ->where('role', UserRole::Teacher)
            ->where('status', UserStatus::Active)
            ->where('school_id', $schoolId)
            ->whereIn('school_track', $enabledTracks)
            ->orderBy('name')
            ->get()
            ->map(fn (User $teacher): array => $this->serializeTeacher($teacher))
            ->values();

        $requests = User::query()
            ->where('role', UserRole::Teacher)
            ->where('school_id', $schoolId)
            ->whereIn('status', [UserStatus::Pending, UserStatus::Denied])
            ->latest()
            ->get()
            ->map(fn (User $teacher): array => $this->serializeTeacher($teacher))
            ->values();

        return response()->json([
            'teachers' => $teachers,
            'requests' => $requests,
            'allocations' => $teachers
                ->filter(fn (array $teacher): bool => filled($teacher['assigned_class_name']))
                ->values(),
            'options' => [
                'enabledTracks' => $enabledTracks,
                'classesByTrack' => collect(SchoolContextOptions::classesByTrack($schoolId))->only($enabledTracks)->all(),
                'takenClassesByTrack' => SchoolContextOptions::takenClassesByTrack(null, $schoolId),
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
                'classesByTrack' => SchoolContextOptions::classesByTrack($request->user()?->school_id),
                'takenClassesByTrack' => SchoolContextOptions::takenClassesByTrack($teacher->fresh(), $request->user()?->school_id),
            ],
        ]);
    }

    public function approve(Request $request, User $teacher): JsonResponse
    {
        $this->authorizeTeacherRequest($request, $teacher);

        $teacher->update([
            'status' => UserStatus::Active,
        ]);

        return response()->json([
            'message' => "{$teacher->name}'s teacher account request was accepted.",
            'teacher' => $this->serializeTeacher($teacher->fresh()),
        ]);
    }

    public function deny(Request $request, User $teacher): JsonResponse
    {
        $this->authorizeTeacherRequest($request, $teacher);

        $teacher->update([
            'status' => UserStatus::Denied,
            'assigned_class_name' => null,
        ]);

        return response()->json([
            'message' => "{$teacher->name}'s teacher account request was denied.",
            'teacher' => $this->serializeTeacher($teacher->fresh()),
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
            'created_at' => $teacher->created_at?->toIso8601String(),
        ];
    }

    private function authorizeTeacherRequest(Request $request, User $teacher): void
    {
        abort_unless(
            $teacher->role === UserRole::Teacher &&
                $teacher->school_id === $request->user()?->school_id &&
                in_array($teacher->status, [UserStatus::Pending, UserStatus::Denied], true),
            404,
        );
    }
}
