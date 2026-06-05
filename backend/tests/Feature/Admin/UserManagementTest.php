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
            'email_verified' => '1',
            'password' => 'Password123!',
            'password_confirmation' => 'Password123!',
        ]);

        $response->assertRedirect('/admin/users');
        $this->assertDatabaseHas('users', [
            'email' => 'grace@example.com',
            'role' => UserRole::Teacher->value,
            'status' => UserStatus::Active->value,
        ]);
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
