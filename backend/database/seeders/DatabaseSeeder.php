<?php

namespace Database\Seeders;

use App\Enums\UserRole;
use App\Enums\UserStatus;
use App\Models\School;
use App\Models\SchoolSubject;
use App\Models\User;
use App\Support\UserNotificationCenter;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        $defaultSchool = School::query()->firstOrCreate([
            'name' => trim((string) config('app.name', 'School Management System')),
        ]);

        User::query()->updateOrCreate([
            'email' => env('ADMIN_EMAIL', 'admin@school.test'),
        ], [
            'name' => env('ADMIN_NAME', 'System Administrator'),
            'password' => env('ADMIN_PASSWORD', 'password'),
            'role' => UserRole::Admin,
            'status' => UserStatus::Active,
            'school_id' => $defaultSchool->id,
            'email_verified_at' => now(),
        ]);
        $adminUser = User::query()->where('email', env('ADMIN_EMAIL', 'admin@school.test'))->first();

        User::query()->updateOrCreate([
            'email' => 'test@example.com',
        ], [
            'name' => 'Head Teacher Demo',
            'password' => 'password',
            'role' => UserRole::Management,
            'status' => UserStatus::Active,
            'school_id' => $defaultSchool->id,
            'email_verified_at' => now(),
        ]);
        $managementUser = User::query()->where('email', 'test@example.com')->first();

        User::query()->updateOrCreate([
            'email' => 'teacher@example.com',
        ], [
            'name' => 'Primary Teacher Demo',
            'password' => 'password',
            'role' => UserRole::Teacher,
            'status' => UserStatus::Active,
            'school_id' => $defaultSchool->id,
            'school_track' => 'primary',
            'assigned_class_name' => 'Standard 1',
            'email_verified_at' => now(),
        ]);
        $teacherUser = User::query()->where('email', 'teacher@example.com')->first();

        User::query()->updateOrCreate([
            'email' => 'finance@example.com',
        ], [
            'name' => 'Finance Demo',
            'password' => 'password',
            'role' => UserRole::Accountant,
            'status' => UserStatus::Active,
            'school_id' => $defaultSchool->id,
            'email_verified_at' => now(),
        ]);
        $financeUser = User::query()->where('email', 'finance@example.com')->first();

        SchoolSubject::query()->updateOrCreate([
            'school_track' => 'primary',
            'name' => 'Mathematics',
        ], [
            'code' => 'MATH',
        ]);

        SchoolSubject::query()->updateOrCreate([
            'school_track' => 'secondary',
            'name' => 'English',
        ], [
            'code' => 'ENG',
        ]);

        foreach ([$adminUser, $managementUser, $teacherUser, $financeUser] as $seedUser) {
            if (! $seedUser) {
                continue;
            }

            if (! $seedUser->notifications()->exists()) {
                UserNotificationCenter::welcome($seedUser);
            }
        }
    }
}
