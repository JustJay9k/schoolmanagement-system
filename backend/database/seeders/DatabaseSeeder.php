<?php

namespace Database\Seeders;

use App\Enums\UserRole;
use App\Enums\UserStatus;
use App\Models\SchoolSubject;
use App\Models\User;
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
        User::query()->updateOrCreate([
            'email' => env('ADMIN_EMAIL', 'admin@school.test'),
        ], [
            'name' => env('ADMIN_NAME', 'System Administrator'),
            'password' => env('ADMIN_PASSWORD', 'password'),
            'role' => UserRole::Admin,
            'status' => UserStatus::Active,
            'email_verified_at' => now(),
        ]);

        User::query()->updateOrCreate([
            'email' => 'test@example.com',
        ], [
            'name' => 'Head Teacher Demo',
            'password' => 'password',
            'role' => UserRole::Management,
            'status' => UserStatus::Active,
            'email_verified_at' => now(),
        ]);

        User::query()->updateOrCreate([
            'email' => 'teacher@example.com',
        ], [
            'name' => 'Primary Teacher Demo',
            'password' => 'password',
            'role' => UserRole::Teacher,
            'status' => UserStatus::Active,
            'school_track' => 'primary',
            'assigned_class_name' => 'Standard 1',
            'email_verified_at' => now(),
        ]);

        User::query()->updateOrCreate([
            'email' => 'finance@example.com',
        ], [
            'name' => 'Finance Demo',
            'password' => 'password',
            'role' => UserRole::Accountant,
            'status' => UserStatus::Active,
            'email_verified_at' => now(),
        ]);

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
    }
}
