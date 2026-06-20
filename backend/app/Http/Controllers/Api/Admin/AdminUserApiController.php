<?php

namespace App\Http\Controllers\Api\Admin;

use App\Enums\UserRole;
use App\Enums\UserStatus;
use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\StoreAdminUserRequest;
use App\Http\Requests\Admin\UpdateAdminUserRequest;
use App\Models\User;
use App\Support\SchoolContextOptions;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class AdminUserApiController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $filters = [
            'search' => trim((string) $request->string('search')),
            'role' => $request->string('role')->toString(),
            'status' => $request->string('status')->toString(),
        ];

        $users = User::query()
            ->when($filters['search'] !== '', function ($query) use ($filters) {
                $query->where(function ($nestedQuery) use ($filters) {
                    $nestedQuery
                        ->where('name', 'like', '%'.$filters['search'].'%')
                        ->orWhere('email', 'like', '%'.$filters['search'].'%');
                });
            })
            ->when($filters['role'] !== '', fn ($query) => $query->where('role', $filters['role']))
            ->when($filters['status'] !== '', fn ($query) => $query->where('status', $filters['status']))
            ->latest()
            ->get()
            ->map(fn (User $user): array => $this->serializeUser($user))
            ->values();

        return response()->json([
            'users' => $users,
            'filters' => $filters,
            'stats' => [
                'total' => User::count(),
                'admins' => User::where('role', UserRole::Admin)->count(),
                'active' => User::where('status', UserStatus::Active)->count(),
                'inactive' => User::where('status', UserStatus::Inactive)->count(),
                'suspended' => User::where('status', UserStatus::Suspended)->count(),
            ],
            'options' => $this->options(),
        ]);
    }

    public function store(StoreAdminUserRequest $request): JsonResponse
    {
        $user = User::create($this->payload($request));

        return response()->json([
            'message' => 'User account created successfully.',
            'user' => $this->serializeUser($user->fresh()),
        ], 201);
    }

    public function update(UpdateAdminUserRequest $request, User $user): JsonResponse
    {
        $payload = $this->payload($request, $user);

        if ($request->user()->is($user) && isset($payload['role']) && $payload['role'] !== UserRole::Admin) {
            return response()->json([
                'message' => 'Validation failed.',
                'errors' => [
                    'role' => ['You cannot remove your own administrator access from this screen.'],
                ],
            ], 422);
        }

        if ($request->user()->is($user) && isset($payload['status']) && $payload['status'] !== UserStatus::Active) {
            return response()->json([
                'message' => 'Validation failed.',
                'errors' => [
                    'status' => ['You cannot disable the account you are currently using.'],
                ],
            ], 422);
        }

        if (
            $user->isAdmin() &&
            ($payload['status'] ?? $user->status) !== UserStatus::Active &&
            User::where('role', UserRole::Admin)
                ->where('status', UserStatus::Active)
                ->count() <= 1
        ) {
            return response()->json([
                'message' => 'Validation failed.',
                'errors' => [
                    'status' => ['At least one active administrator must remain in the system.'],
                ],
            ], 422);
        }

        if (
            $user->isAdmin() &&
            ($payload['role'] ?? $user->role) !== UserRole::Admin &&
            User::where('role', UserRole::Admin)->count() <= 1
        ) {
            return response()->json([
                'message' => 'Validation failed.',
                'errors' => [
                    'role' => ['At least one administrator must remain in the system.'],
                ],
            ], 422);
        }

        $user->update($payload);

        if ($user->status !== UserStatus::Active) {
            DB::table('sessions')->where('user_id', $user->id)->delete();
        }

        return response()->json([
            'message' => 'User account updated successfully.',
            'user' => $this->serializeUser($user->fresh()),
        ]);
    }

    public function updateStatus(Request $request, User $user): JsonResponse
    {
        $targetStatus = $user->status === UserStatus::Active
            ? UserStatus::Inactive
            : UserStatus::Active;

        if ($request->user()->is($user) && $targetStatus !== UserStatus::Active) {
            return response()->json([
                'message' => 'Validation failed.',
                'errors' => [
                    'status' => ['You cannot disable the account you are currently using.'],
                ],
            ], 422);
        }

        if (
            $user->isAdmin() &&
            $targetStatus !== UserStatus::Active &&
            User::where('role', UserRole::Admin)
                ->where('status', UserStatus::Active)
                ->count() <= 1
        ) {
            return response()->json([
                'message' => 'Validation failed.',
                'errors' => [
                    'status' => ['At least one active administrator must remain in the system.'],
                ],
            ], 422);
        }

        $user->update([
            'status' => $targetStatus,
        ]);

        if ($targetStatus !== UserStatus::Active) {
            DB::table('sessions')->where('user_id', $user->id)->delete();
        }

        return response()->json([
            'message' => $targetStatus === UserStatus::Active
                ? 'User account enabled successfully.'
                : 'User account disabled successfully.',
            'user' => $this->serializeUser($user->fresh()),
        ]);
    }

    public function destroy(Request $request, User $user): JsonResponse
    {
        if ($request->user()->is($user)) {
            return response()->json([
                'message' => 'Validation failed.',
                'errors' => [
                    'delete' => ['You cannot delete the account you are currently signed in with.'],
                ],
            ], 422);
        }

        if ($user->isAdmin() && User::where('role', UserRole::Admin)->count() <= 1) {
            return response()->json([
                'message' => 'Validation failed.',
                'errors' => [
                    'delete' => ['At least one administrator must remain in the system.'],
                ],
            ], 422);
        }

        DB::table('sessions')->where('user_id', $user->id)->delete();
        $user->delete();

        return response()->json([
            'message' => 'User account deleted successfully.',
        ]);
    }

    /**
     * @return array<string, mixed>
     */
    private function payload(StoreAdminUserRequest|UpdateAdminUserRequest $request, ?User $user = null): array
    {
        $validated = $request->validated();

        $role = UserRole::from($validated['role']);
        $payload = [
            'name' => $validated['name'],
            'email' => $validated['email'],
            'role' => $role,
            'status' => UserStatus::from($validated['status']),
            'school_track' => $role === UserRole::Teacher
                ? ($validated['school_track'] ?? null)
                : null,
            'assigned_class_name' => $role === UserRole::Teacher
                ? ($validated['assigned_class_name'] ?? null)
                : null,
            'email_verified_at' => $request->boolean('email_verified')
                ? ($user?->email_verified_at ?? now())
                : null,
        ];

        if (! empty($validated['password'])) {
            $payload['password'] = $validated['password'];
        }

        return $payload;
    }

    /**
     * @return array<string, mixed>
     */
    private function options(): array
    {
        return [
            'roles' => collect(UserRole::cases())
                ->map(fn (UserRole $role): array => [
                    'value' => $role->value,
                    'label' => $role->label(),
                ])
                ->values(),
            'statuses' => collect(UserStatus::cases())
                ->map(fn (UserStatus $status): array => [
                    'value' => $status->value,
                    'label' => $status->label(),
                ])
                ->values(),
            'schoolTracks' => SchoolContextOptions::tracks(),
            'classesByTrack' => SchoolContextOptions::classesByTrack(),
            'takenClassesByTrack' => SchoolContextOptions::takenClassesByTrack(),
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function serializeUser(User $user): array
    {
        return [
            'id' => $user->id,
            'name' => $user->name,
            'email' => $user->email,
            'role' => $user->role?->value ?? $user->role,
            'role_label' => $user->role?->label() ?? (string) $user->role,
            'status' => $user->status?->value ?? $user->status,
            'status_label' => $user->status?->label() ?? (string) $user->status,
            'school_track' => $user->school_track,
            'assigned_class_name' => $user->assigned_class_name,
            'form_class_name' => $user->isFormTeacher() ? $user->assigned_class_name : null,
            'is_form_teacher' => $user->isFormTeacher(),
            'teaching_roles' => $user->teachingRoles(),
            'email_verified_at' => $user->email_verified_at?->toIso8601String(),
            'created_at' => $user->created_at?->toIso8601String(),
            'last_login_at' => $user->last_login_at?->toIso8601String(),
        ];
    }
}
