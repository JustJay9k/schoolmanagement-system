<?php

namespace Tests\Feature\Auth;

use App\Enums\UserRole;
use App\Models\School;
use App\Models\StudentRecord;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class RegistrationTest extends TestCase
{
    use RefreshDatabase;

    public function test_new_users_can_register(): void
    {
        $school = School::query()->create([
            'name' => 'Mzuzu Academy',
        ]);

        $response = $this->post('/register', [
            'account_type' => 'teacher',
            'name' => 'Test User',
            'email' => 'test@example.com',
            'school_id' => $school->id,
            'school_track' => 'secondary',
            'assigned_class_name' => 'Form 1',
            'password' => 'password',
            'password_confirmation' => 'password',
        ]);

        $this->assertAuthenticated();
        $response->assertNoContent();
        $this->assertDatabaseHas('users', [
            'email' => 'test@example.com',
            'role' => UserRole::Teacher->value,
            'school_track' => 'secondary',
            'assigned_class_name' => 'Form 1',
        ]);
    }

    public function test_teacher_registration_rejects_a_class_that_is_already_taken(): void
    {
        $school = School::query()->create([
            'name' => 'Blantyre Academy',
        ]);

        User::factory()->teacher()->create([
            'school_id' => $school->id,
            'school_track' => 'secondary',
            'assigned_class_name' => 'Form 1',
        ]);

        $response = $this->postJson('/register', [
            'account_type' => 'teacher',
            'name' => 'Second Teacher',
            'email' => 'second@example.com',
            'school_id' => $school->id,
            'school_track' => 'secondary',
            'assigned_class_name' => 'Form 1',
            'password' => 'password',
            'password_confirmation' => 'password',
        ]);

        $response
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['assigned_class_name']);

        $this->assertGuest();
    }

    public function test_secondary_teacher_can_register_without_a_form_class(): void
    {
        $school = School::query()->create([
            'name' => 'Lilongwe Academy',
        ]);

        $response = $this->post('/register', [
            'account_type' => 'teacher',
            'name' => 'Subject Teacher',
            'email' => 'subject-only@example.com',
            'school_id' => $school->id,
            'school_track' => 'secondary',
            'assigned_class_name' => '',
            'password' => 'password',
            'password_confirmation' => 'password',
        ]);

        $this->assertAuthenticated();
        $response->assertNoContent();
        $this->assertDatabaseHas('users', [
            'email' => 'subject-only@example.com',
            'school_track' => 'secondary',
            'assigned_class_name' => null,
        ]);
    }

    public function test_guardian_can_register_against_an_existing_student_record(): void
    {
        $school = School::query()->create([
            'name' => 'Zomba Academy',
        ]);

        $student = StudentRecord::query()->create([
            'school_id' => $school->id,
            'school_track' => 'primary',
            'class_name' => 'Standard 3',
            'full_name' => 'Martha Kalua',
        ]);

        $response = $this->post('/register', [
            'account_type' => 'guardian',
            'name' => 'Mrs Kalua',
            'email' => 'guardian@example.com',
            'school_id' => $school->id,
            'child_id' => $student->id,
            'password' => 'password',
            'password_confirmation' => 'password',
        ]);

        $this->assertAuthenticated();
        $response->assertNoContent();
        $this->assertDatabaseHas('users', [
            'email' => 'guardian@example.com',
            'role' => UserRole::Guardian->value,
            'school_id' => $school->id,
            'linked_student_record_id' => $student->id,
        ]);
    }

    public function test_registration_options_include_students_grouped_by_school(): void
    {
        $school = School::query()->create([
            'name' => 'Zomba Academy',
        ]);

        StudentRecord::query()->create([
            'school_id' => $school->id,
            'school_track' => 'primary',
            'class_name' => 'Standard 3',
            'full_name' => 'Martha Kalua',
            'student_code' => 'STU-33',
        ]);

        $this->getJson('/register/options')
            ->assertOk()
            ->assertJsonPath("studentsBySchool.{$school->id}.0.label", 'Martha Kalua')
            ->assertJsonPath("studentsBySchool.{$school->id}.0.class_name", 'Standard 3')
            ->assertJsonPath("studentsBySchool.{$school->id}.0.student_code", 'STU-33');
    }
}
