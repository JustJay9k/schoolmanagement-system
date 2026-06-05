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

        $response = $this->actingAs($admin)->post('/admin/users', [
            'name' => 'Grace Hopper',
            'email' => 'grace@example.com',
            'role' => UserRole::Teacher->value,
            'status' => UserStatus::Active->value,
            'school_track' => 'secondary',
            'assigned_class_name' => 'Year 10 - English (10A)',
            'email_verified' => '1',
            'password' => 'Password123!',
            'password_confirmation' => 'Password123!',
        ]);

        $response->assertRedirect('/admin/users');
        $this->assertDatabaseHas('users', [
            'email' => 'grace@example.com',
            'role' => UserRole::Teacher->value,
            'status' => UserStatus::Active->value,
            'school_track' => 'secondary',
            'assigned_class_name' => 'Year 10 - English (10A)',
        ]);
    }

    public function test_teacher_assignments_are_required_when_admin_creates_a_teacher(): void
    {
        $admin = User::factory()->admin()->create();

        $response = $this->actingAs($admin)->post('/admin/users', [
            'name' => 'Unassigned Teacher',
            'email' => 'teacher@example.com',
            'role' => UserRole::Teacher->value,
            'status' => UserStatus::Active->value,
            'password' => 'Password123!',
            'password_confirmation' => 'Password123!',
        ]);

        $response
            ->assertSessionHasErrors(['school_track', 'assigned_class_name']);
    }

    public function test_admin_can_update_a_user(): void
    {
        $admin = User::factory()->admin()->create();
        $user = User::factory()->create();

        $response = $this->actingAs($admin)->put("/admin/users/{$user->id}", [
            'name' => 'Updated User',
            'email' => $user->email,
            'role' => UserRole::Accountant->value,
            'status' => UserStatus::Suspended->value,
            'password' => '',
            'password_confirmation' => '',
        ]);

        $response->assertRedirect('/admin/users');
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
            'assigned_class_name' => 'Year 10 - English (10A)',
        ]);

        $response = $this->actingAs($admin)->post('/admin/users', [
            'name' => 'Second Teacher',
            'email' => 'second-teacher@example.com',
            'role' => UserRole::Teacher->value,
            'status' => UserStatus::Active->value,
            'school_track' => 'secondary',
            'assigned_class_name' => 'Year 10 - English (10A)',
            'password' => 'Password123!',
            'password_confirmation' => 'Password123!',
        ]);

        $response->assertSessionHasErrors(['assigned_class_name']);
    }

    public function test_teacher_can_keep_their_existing_class_when_updating_their_account(): void
    {
        $admin = User::factory()->admin()->create();
        $teacher = User::factory()->teacher()->create([
            'school_track' => 'secondary',
            'assigned_class_name' => 'Year 10 - English (10A)',
        ]);

        $response = $this->actingAs($admin)->put("/admin/users/{$teacher->id}", [
            'name' => 'Updated Teacher',
            'email' => $teacher->email,
            'role' => UserRole::Teacher->value,
            'status' => UserStatus::Active->value,
            'school_track' => 'secondary',
            'assigned_class_name' => 'Year 10 - English (10A)',
            'password' => '',
            'password_confirmation' => '',
        ]);

        $response->assertRedirect('/admin/users');
        $this->assertDatabaseHas('users', [
            'id' => $teacher->id,
            'name' => 'Updated Teacher',
            'assigned_class_name' => 'Year 10 - English (10A)',
        ]);
    }

    public function test_last_admin_cannot_be_deleted(): void
    {
        $admin = User::factory()->admin()->create();

        $response = $this->actingAs($admin)->delete("/admin/users/{$admin->id}");

        $response->assertSessionHasErrors('delete');
        $this->assertDatabaseHas('users', [
            'id' => $admin->id,
        ]);
    }
}
