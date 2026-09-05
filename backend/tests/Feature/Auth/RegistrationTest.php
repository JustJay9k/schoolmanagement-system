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

    public function test_guardian_can_register_against_an_existing_student_record_by_name(): void
    {
        $school = School::query()->create([
            'name' => 'Zomba Academy',
        ]);

        $student = StudentRecord::query()->create([
            'school_id' => $school->id,
            'school_track' => 'primary',
            'class_name' => 'Standard 3',
            'full_name' => 'Martha Kalua',
            'guardian_name' => 'Mrs Kalua',
            'guardian_email' => 'kalua@example.com',
        ]);

        $response = $this->post('/register', [
            'account_type' => 'guardian',
            'name' => 'Mrs Kalua',
            'email' => 'kalua@example.com',
            'school_id' => $school->id,
            'child_name' => 'Martha Kalua',
            'password' => 'password',
            'password_confirmation' => 'password',
        ]);

        $this->assertAuthenticated();
        $response->assertNoContent();
        $this->assertDatabaseHas('users', [
            'email' => 'kalua@example.com',
            'role' => UserRole::Guardian->value,
            'school_id' => $school->id,
            'linked_student_record_id' => $student->id,
        ]);
    }

    public function test_guardian_can_register_using_student_code(): void
    {
        $school = School::query()->create([
            'name' => 'Blantyre Academy',
        ]);

        $student = StudentRecord::query()->create([
            'school_id' => $school->id,
            'school_track' => 'secondary',
            'class_name' => 'Form 2',
            'full_name' => 'Brian Chirwa',
            'student_code' => 'F2-0099',
            'guardian_name' => 'Mr Chirwa',
            'guardian_email' => 'chirwa@example.com',
        ]);

        $response = $this->post('/register', [
            'account_type' => 'guardian',
            'name' => 'Parent Chirwa',
            'email' => 'parent.chirwa@example.com',
            'school_id' => $school->id,
            'child_name' => 'F2-0099',
            'password' => 'password',
            'password_confirmation' => 'password',
        ]);

        $this->assertAuthenticated();
        $response->assertNoContent();
        $this->assertDatabaseHas('users', [
            'email' => 'parent.chirwa@example.com',
            'role' => UserRole::Guardian->value,
            'school_id' => $school->id,
            'linked_student_record_id' => $student->id,
        ]);
    }

    public function test_guardian_cannot_link_a_child_that_is_not_their_own(): void
    {
        $school = School::query()->create([
            'name' => 'Lilongwe Academy',
        ]);

        StudentRecord::query()->create([
            'school_id' => $school->id,
            'school_track' => 'secondary',
            'class_name' => 'Form 1',
            'full_name' => 'Brian Chirwa',
            'student_code' => 'F1-0088',
            'guardian_name' => 'Mr Chirwa',
            'guardian_email' => 'chirwa@example.com',
        ]);

        $response = $this->postJson('/register', [
            'account_type' => 'guardian',
            'name' => 'Stranger Danger',
            'email' => 'stranger@example.com',
            'school_id' => $school->id,
            'child_name' => 'Brian Chirwa',
            'password' => 'password',
            'password_confirmation' => 'password',
        ]);

        $response
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['child_name']);

        $this->assertGuest();
    }

    public function test_registration_options_does_not_expose_student_records(): void
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

        $response = $this->getJson('/register/options');

        $response->assertOk();
        $response->assertJsonMissingPath('studentsBySchool');
    }
}
