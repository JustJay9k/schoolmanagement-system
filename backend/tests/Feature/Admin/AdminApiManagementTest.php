<?php

namespace Tests\Feature\Admin;

use App\Enums\UserRole;
use App\Enums\UserStatus;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AdminApiManagementTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_can_list_users_through_api(): void
    {
        $admin = User::factory()->admin()->create();
        $teacher = User::factory()->teacher()->create([
            'school_track' => 'secondary',
            'assigned_class_name' => 'Form 1',
        ]);

        $this->actingAs($admin)
            ->getJson('/api/admin/users')
            ->assertOk()
            ->assertJsonFragment([
                'email' => $teacher->email,
                'role' => UserRole::Teacher->value,
                'school_track' => 'secondary',
                'assigned_class_name' => 'Form 1',
                'form_class_name' => 'Form 1',
                'is_form_teacher' => true,
            ]);
    }

    public function test_admin_can_toggle_user_status_through_api(): void
    {
        $admin = User::factory()->admin()->create();
        $teacher = User::factory()->teacher()->create([
            'status' => UserStatus::Active,
        ]);

        $this->actingAs($admin)
            ->patchJson("/api/admin/users/{$teacher->id}/status")
            ->assertOk()
            ->assertJsonFragment([
                'status' => UserStatus::Inactive->value,
            ]);

        $this->assertDatabaseHas('users', [
            'id' => $teacher->id,
            'status' => UserStatus::Inactive->value,
        ]);
    }

    public function test_admin_can_update_a_teacher_assignment_through_api(): void
    {
        $admin = User::factory()->admin()->create();
        $teacher = User::factory()->teacher()->create([
            'school_track' => 'secondary',
            'assigned_class_name' => 'Form 1',
        ]);

        $this->actingAs($admin)
            ->putJson("/api/admin/users/{$teacher->id}", [
                'name' => $teacher->name,
                'email' => $teacher->email,
                'role' => UserRole::Teacher->value,
                'status' => UserStatus::Active->value,
                'school_track' => 'secondary',
                'assigned_class_name' => 'Form 2',
                'password' => '',
                'password_confirmation' => '',
                'email_verified' => true,
            ])
            ->assertOk()
            ->assertJsonFragment([
                'assigned_class_name' => 'Form 2',
                'form_class_name' => 'Form 2',
                'is_form_teacher' => true,
            ]);

        $this->assertDatabaseHas('users', [
            'id' => $teacher->id,
            'assigned_class_name' => 'Form 2',
        ]);
    }

    public function test_admin_can_update_school_structure_through_api(): void
    {
        $admin = User::factory()->admin()->create();

        $this->actingAs($admin)
            ->putJson('/api/admin/school-structure', [
                'primary_classes' => "Reception\nStandard 1",
                'secondary_classes' => "Form A\nForm B",
            ])
            ->assertOk()
            ->assertJsonPath('classesByTrack.primary', ['Reception', 'Standard 1'])
            ->assertJsonPath('classesByTrack.secondary', ['Form A', 'Form B']);
    }
}
