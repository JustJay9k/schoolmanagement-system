<?php

namespace App\Http\Controllers\Admin;

use App\Enums\UserRole;
use App\Enums\UserStatus;
use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\StoreAdminUserRequest;
use App\Http\Requests\Admin\UpdateAdminUserRequest;
use App\Models\User;
use App\Support\SchoolContextOptions;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\View\View;

class AdminUserController extends Controller
{
    public function index(Request $request): View
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
            ->paginate(12)
            ->withQueryString();

        return view('admin.users.index', [
            'users' => $users,
            'filters' => $filters,
            'roles' => UserRole::cases(),
            'statuses' => UserStatus::cases(),
            'stats' => [
                'total' => User::count(),
                'admins' => User::where('role', UserRole::Admin)->count(),
                'active' => User::where('status', UserStatus::Active)->count(),
                'suspended' => User::where('status', UserStatus::Suspended)->count(),
            ],
        ]);
    }

    public function create(): View
    {
        return view('admin.users.create', [
            'roles' => UserRole::cases(),
            'statuses' => UserStatus::cases(),
            'schoolTracks' => SchoolContextOptions::tracks(),
            'classesByTrack' => SchoolContextOptions::classesByTrack(),
            'takenClassesByTrack' => SchoolContextOptions::takenClassesByTrack(),
        ]);
    }

    public function store(StoreAdminUserRequest $request): RedirectResponse
    {
        User::create($this->payload($request));

        return redirect()
            ->route('admin.users.index')
            ->with('status', 'User account created successfully.');
    }

    public function edit(User $user): View
    {
        return view('admin.users.edit', [
            'userModel' => $user,
            'roles' => UserRole::cases(),
            'statuses' => UserStatus::cases(),
            'schoolTracks' => SchoolContextOptions::tracks(),
            'classesByTrack' => SchoolContextOptions::classesByTrack(),
            'takenClassesByTrack' => SchoolContextOptions::takenClassesByTrack($user),
        ]);
    }

    public function update(UpdateAdminUserRequest $request, User $user): RedirectResponse
    {
        $payload = $this->payload($request, $user);

        if ($request->user()->is($user) && isset($payload['role']) && $payload['role'] !== UserRole::Admin) {
            return back()
                ->withInput()
                ->withErrors(['role' => 'You cannot remove your own administrator access from this screen.']);
        }

        if ($request->user()->is($user) && isset($payload['status']) && $payload['status'] !== UserStatus::Active) {
            return back()
                ->withInput()
                ->withErrors(['status' => 'You cannot disable the account you are currently using.']);
        }

        if (
            $user->isAdmin() &&
            ($payload['role'] ?? $user->role) !== UserRole::Admin &&
            User::where('role', UserRole::Admin)->count() <= 1
        ) {
            return back()
                ->withInput()
                ->withErrors(['role' => 'At least one administrator must remain in the system.']);
        }

        $user->update($payload);

        if ($user->status !== UserStatus::Active) {
            DB::table('sessions')->where('user_id', $user->id)->delete();
        }

        return redirect()
            ->route('admin.users.index')
            ->with('status', 'User account updated successfully.');
    }

    public function destroy(Request $request, User $user): RedirectResponse
    {
        if ($request->user()->is($user)) {
            return back()->withErrors([
                'delete' => 'You cannot delete the account you are currently signed in with.',
            ]);
        }

        if ($user->isAdmin() && User::where('role', UserRole::Admin)->count() <= 1) {
            return back()->withErrors([
                'delete' => 'At least one administrator must remain in the system.',
            ]);
        }

        DB::table('sessions')->where('user_id', $user->id)->delete();
        $user->delete();

        return redirect()
            ->route('admin.users.index')
            ->with('status', 'User account deleted successfully.');
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
}
