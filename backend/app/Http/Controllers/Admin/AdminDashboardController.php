<?php

namespace App\Http\Controllers\Admin;

use App\Enums\UserRole;
use App\Enums\UserStatus;
use App\Http\Controllers\Controller;
use App\Models\SchoolSubject;
use App\Models\Timetable;
use App\Models\User;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\DB;
use Illuminate\View\View;

class AdminDashboardController extends Controller
{
    public function __invoke(): View
    {
        $user = auth()->user();
        $totalUsers = User::count();
        $activeUsers = User::where('status', UserStatus::Active)->count();
        $adminUsers = User::where('role', UserRole::Admin)->count();
        $unverifiedUsers = User::whereNull('email_verified_at')->count();
        $newUsersThisMonth = User::where('created_at', '>=', now()->startOfMonth())->count();
        $totalSubjects = SchoolSubject::count();
        $totalTimetables = Timetable::count();
        $myTimetables = $user?->isTeacher()
            ? Timetable::where('assigned_teacher_id', $user->id)->count()
            : 0;
        $liveSessions = DB::table('sessions')
            ->where('last_activity', '>=', now()->subMinutes(30)->getTimestamp())
            ->count();

        $roleBreakdown = User::query()
            ->select('role', DB::raw('COUNT(*) as total'))
            ->groupBy('role')
            ->orderByDesc('total')
            ->get()
            ->map(fn (object $row): array => [
                'role' => $row->role,
                'total' => (int) $row->total,
            ]);

        $statusBreakdown = User::query()
            ->select('status', DB::raw('COUNT(*) as total'))
            ->groupBy('status')
            ->orderByDesc('total')
            ->get()
            ->map(fn (object $row): array => [
                'status' => $row->status,
                'total' => (int) $row->total,
            ]);

        $recentUsers = User::latest()->take(6)->get();

        $modules = [];

        if ($user?->canManageAdministration()) {
            $modules[] = [
                'title' => 'User management',
                'metric' => number_format($totalUsers),
                'detail' => 'Central control for administrator, teacher, student, and guardian accounts.',
                'action_label' => 'Open roster',
                'action_url' => route('admin.users.index'),
            ];
            $modules[] = [
                'title' => 'School structure',
                'metric' => '2 tracks',
                'detail' => 'Set the default class names for primary and secondary so teacher onboarding matches your school.',
                'action_label' => 'Edit classes',
                'action_url' => route('admin.school-structure.edit'),
            ];
        }

        if ($user?->canManageTimetables()) {
            $modules[] = [
                'title' => 'Subjects',
                'metric' => number_format($totalSubjects),
                'detail' => 'Build the primary and secondary subject list your school uses before scheduling classes.',
                'action_label' => 'Manage subjects',
                'action_url' => route('admin.subjects.index'),
            ];
            $modules[] = [
                'title' => 'Timetables',
                'metric' => number_format($totalTimetables),
                'detail' => 'Create one timetable per class, assign it to a teacher, and keep track-specific schedules organized.',
                'action_label' => 'Open timetables',
                'action_url' => route('admin.timetables.index'),
            ];
        }

        if ($user?->isTeacher()) {
            $modules[] = [
                'title' => 'My timetable',
                'metric' => number_format($myTimetables),
                'detail' => 'See the class timetables that have been assigned directly to your teacher account.',
                'action_label' => 'Open my timetable',
                'action_url' => route('teacher.timetables.index'),
            ];
        }

        $modules[] = [
            'title' => 'Live activity',
            'metric' => number_format($liveSessions),
            'detail' => 'Session visibility helps you see whether the portal is active and where to watch for unusual churn.',
            'action_label' => $user?->isTeacher() ? 'Refresh workspace' : 'Inspect users',
            'action_url' => $user?->isTeacher() ? route('teacher.timetables.index') : route('dashboard'),
        ];

        $systemStatus = [
            ['label' => 'Environment', 'value' => Config::get('app.env')],
            ['label' => 'Database', 'value' => Config::get('database.default')],
            ['label' => 'Queue', 'value' => Config::get('queue.default')],
            ['label' => 'Cache', 'value' => Config::get('cache.default')],
            ['label' => 'Mailer', 'value' => Config::get('mail.default')],
            ['label' => 'PHP', 'value' => PHP_VERSION],
        ];

        return view('admin.dashboard', [
            'summaryCards' => [
                ['label' => $user?->isTeacher() ? 'My timetables' : 'Total accounts', 'value' => $user?->isTeacher() ? $myTimetables : $totalUsers, 'hint' => $user?->isTeacher() ? 'Timetables assigned to your account.' : 'All registered people in the platform.'],
                ['label' => $user?->isTeacher() ? 'My class' : 'Active accounts', 'value' => $user?->isTeacher() ? ($user->assigned_class_name ?? 'Unassigned') : $activeUsers, 'hint' => $user?->isTeacher() ? 'Your current class allocation.' : 'Users currently allowed into the system.'],
                ['label' => 'School subjects', 'value' => $totalSubjects, 'hint' => 'Subjects available for timetable planning.'],
                ['label' => 'Class timetables', 'value' => $totalTimetables, 'hint' => 'Saved schedules across all configured classes.'],
            ],
            'modules' => $modules,
            'recentUsers' => $recentUsers,
            'roleBreakdown' => $roleBreakdown,
            'statusBreakdown' => $statusBreakdown,
            'systemStatus' => $systemStatus,
            'currentUser' => $user,
        ]);
    }
}
