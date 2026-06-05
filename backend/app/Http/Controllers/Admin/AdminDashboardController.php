<?php

namespace App\Http\Controllers\Admin;

use App\Enums\UserRole;
use App\Enums\UserStatus;
use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\DB;
use Illuminate\View\View;

class AdminDashboardController extends Controller
{
    public function __invoke(): View
    {
        $totalUsers = User::count();
        $activeUsers = User::where('status', UserStatus::Active)->count();
        $adminUsers = User::where('role', UserRole::Admin)->count();
        $unverifiedUsers = User::whereNull('email_verified_at')->count();
        $newUsersThisMonth = User::where('created_at', '>=', now()->startOfMonth())->count();
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

        $modules = [
            [
                'title' => 'User management',
                'metric' => number_format($totalUsers),
                'detail' => 'Central control for administrator, teacher, student, and guardian accounts.',
                'action_label' => 'Open roster',
                'action_url' => route('admin.users.index'),
            ],
            [
                'title' => 'School structure',
                'metric' => '2 tracks',
                'detail' => 'Set the default class names for primary and secondary so teacher onboarding matches your school.',
                'action_label' => 'Edit classes',
                'action_url' => route('admin.school-structure.edit'),
            ],
            [
                'title' => 'Access control',
                'metric' => number_format($adminUsers),
                'detail' => 'Track privileged accounts and keep ownership of critical workflows with the admin team.',
                'action_label' => 'Review admins',
                'action_url' => route('admin.users.index', ['role' => UserRole::Admin->value]),
            ],
            [
                'title' => 'Account health',
                'metric' => number_format($unverifiedUsers),
                'detail' => 'Unverified or suspended users are visible before they become a support backlog.',
                'action_label' => 'Resolve accounts',
                'action_url' => route('admin.users.index', ['status' => UserStatus::Inactive->value]),
            ],
            [
                'title' => 'Live activity',
                'metric' => number_format($liveSessions),
                'detail' => 'Session visibility helps you see whether the portal is active and where to watch for unusual churn.',
                'action_label' => 'Inspect users',
                'action_url' => route('admin.users.index'),
            ],
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
                ['label' => 'Total accounts', 'value' => $totalUsers, 'hint' => 'All registered people in the platform.'],
                ['label' => 'Active accounts', 'value' => $activeUsers, 'hint' => 'Users currently allowed into the system.'],
                ['label' => 'Live sessions', 'value' => $liveSessions, 'hint' => 'Sessions seen in the last 30 minutes.'],
                ['label' => 'Joined this month', 'value' => $newUsersThisMonth, 'hint' => 'Fresh account growth this month.'],
            ],
            'modules' => $modules,
            'recentUsers' => $recentUsers,
            'roleBreakdown' => $roleBreakdown,
            'statusBreakdown' => $statusBreakdown,
            'systemStatus' => $systemStatus,
        ]);
    }
}
