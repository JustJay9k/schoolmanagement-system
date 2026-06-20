<?php

namespace Tests\Feature\Admin;

use App\Enums\UserRole;
use App\Enums\UserStatus;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class UserManagementTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_can_create_a_user(): void
    {
        $admin = User::factory()->admin()->create();

        $response = $this->actingAs($admin)->postJson('/api/admin/users', [
            'name' => 'Grace Hopper',
            'email' => 'grace@example.com',
            'role' => UserRole::Teacher->value,
            'status' => UserStatus::Active->value,
            'school_track' => 'secondary',
            'assigned_class_name' => 'Form 1',
            'email_verified' => '1',
            'password' => 'Password123!',
            'password_confirmation' => 'Password123!',
        ]);

        $response->assertCreated();
        $this->assertDatabaseHas('users', [
            'email' => 'grace@example.com',
            'role' => UserRole::Teacher->value,
            'status' => UserStatus::Active->value,
            'school_track' => 'secondary',
            'assigned_class_name' => 'Form 1',
        ]);
    }

    public function test_admin_can_create_a_secondary_subject_teacher_without_a_form_class(): void
    {
        $admin = User::factory()->admin()->create();

        $response = $this->actingAs($admin)->postJson('/api/admin/users', [
            'name' => 'Subject Teacher',
            'email' => 'subject-teacher@example.com',
            'role' => UserRole::Teacher->value,
            'status' => UserStatus::Active->value,
            'school_track' => 'secondary',
            'password' => 'Password123!',
            'password_confirmation' => 'Password123!',
        ]);

        $response->assertCreated();

        $this->assertDatabaseHas('users', [
            'email' => 'subject-teacher@example.com',
            'school_track' => 'secondary',
            'assigned_class_name' => null,
        ]);
    }

    public function test_primary_teacher_assignments_are_required_when_admin_creates_a_teacher(): void
    {
        $admin = User::factory()->admin()->create();

        $response = $this->actingAs($admin)->postJson('/api/admin/users', [
            'name' => 'Primary Teacher',
            'email' => 'primary-teacher@example.com',
            'role' => UserRole::Teacher->value,
            'status' => UserStatus::Active->value,
            'school_track' => 'primary',
            'password' => 'Password123!',
            'password_confirmation' => 'Password123!',
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['assigned_class_name']);
    }

    public function test_admin_can_update_a_user(): void
    {
        $admin = User::factory()->admin()->create();
        $user = User::factory()->create();

        $response = $this->actingAs($admin)->putJson("/api/admin/users/{$user->id}", [
            'name' => 'Updated User',
            'email' => $user->email,
            'role' => UserRole::Accountant->value,
            'status' => UserStatus::Suspended->value,
            'password' => '',
            'password_confirmation' => '',
        ]);

        $response->assertOk();
        $this->assertDatabaseHas('users', [
            'id' => $user->id,
            'name' => 'Updated User',
            'role' => UserRole::Accountant->value,
            'status' => UserStatus::Suspended->value,
        ]);
    }

    public function test_admin_cannot_assign_the_same_class_to_two_teachers(): void
    {
        $admin = User::factory()->admin()->create();

        User::factory()->teacher()->create([
            'school_track' => 'secondary',
            'assigned_class_name' => 'Form 1',
        ]);

        $response = $this->actingAs($admin)->postJson('/api/admin/users', [
            'name' => 'Second Teacher',
            'email' => 'second-teacher@example.com',
            'role' => UserRole::Teacher->value,
            'status' => UserStatus::Active->value,
            'school_track' => 'secondary',
            'assigned_class_name' => 'Form 1',
            'password' => 'Password123!',
            'password_confirmation' => 'Password123!',
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['assigned_class_name']);
    }

    public function test_teacher_can_keep_their_existing_class_when_updating_their_account(): void
    {
        $admin = User::factory()->admin()->create();
        $teacher = User::factory()->teacher()->create([
            'school_track' => 'secondary',
            'assigned_class_name' => 'Form 1',
        ]);

        $response = $this->actingAs($admin)->putJson("/api/admin/users/{$teacher->id}", [
            'name' => 'Updated Teacher',
            'email' => $teacher->email,
            'role' => UserRole::Teacher->value,
            'status' => UserStatus::Active->value,
            'school_track' => 'secondary',
            'assigned_class_name' => 'Form 1',
            'password' => '',
            'password_confirmation' => '',
        ]);

        $response->assertOk();
        $this->assertDatabaseHas('users', [
            'id' => $teacher->id,
            'name' => 'Updated Teacher',
            'assigned_class_name' => 'Form 1',
        ]);
    }

    public function test_admin_can_disable_and_enable_a_user_account_from_the_list(): void
    {
        $admin = User::factory()->admin()->create();
        $teacher = User::factory()->teacher()->create([
            'status' => UserStatus::Active,
        ]);

        $this->actingAs($admin)
            ->patchJson("/api/admin/users/{$teacher->id}/status")
            ->assertOk();

        $this->assertDatabaseHas('users', [
            'id' => $teacher->id,
            'status' => UserStatus::Inactive->value,
        ]);

        $this->actingAs($admin)
            ->patchJson("/api/admin/users/{$teacher->id}/status")
            ->assertOk();

        $this->assertDatabaseHas('users', [
            'id' => $teacher->id,
            'status' => UserStatus::Active->value,
        ]);
    }

    public function test_last_active_admin_cannot_be_disabled(): void
    {
        $admin = User::factory()->admin()->create([
            'status' => UserStatus::Active,
        ]);

        $this->actingAs($admin)
            ->patchJson("/api/admin/users/{$admin->id}/status")
            ->assertStatus(422)
            ->assertJsonValidationErrors('status');

        $this->assertDatabaseHas('users', [
            'id' => $admin->id,
            'status' => UserStatus::Active->value,
        ]);
    }

    public function test_last_admin_cannot_be_deleted(): void
    {
        $admin = User::factory()->admin()->create();

        $response = $this->actingAs($admin)->deleteJson("/api/admin/users/{$admin->id}");

        $response->assertStatus(422)
            ->assertJsonValidationErrors('delete');
        $this->assertDatabaseHas('users', [
            'id' => $admin->id,
        ]);
    }
}
