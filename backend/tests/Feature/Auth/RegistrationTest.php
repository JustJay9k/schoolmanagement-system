<?php

namespace Tests\Feature\Auth;

use App\Enums\UserRole;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class RegistrationTest extends TestCase
{
    use RefreshDatabase;

    public function test_new_users_can_register(): void
    {
        $response = $this->post('/register', [
            'name' => 'Test User',
            'email' => 'test@example.com',
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
        User::factory()->teacher()->create([
            'school_track' => 'secondary',
            'assigned_class_name' => 'Form 1',
        ]);

        $response = $this->postJson('/register', [
            'name' => 'Second Teacher',
            'email' => 'second@example.com',
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
}
