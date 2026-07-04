<?php

namespace Tests\Feature\Management;

use App\Models\SchoolSetting;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class RegisterScheduleManagementTest extends TestCase
{
    use RefreshDatabase;

    public function test_management_user_can_view_register_schedule(): void
    {
        $manager = User::factory()->management()->create();

        $this->actingAs($manager)
            ->getJson('/api/management/register-schedule')
            ->assertOk()
            ->assertJsonPath('scheduleByTrack.primary.0.label', 'AM')
            ->assertJsonPath('scheduleByTrack.secondary.2.label', 'Period 1');
    }

    public function test_management_user_can_update_register_schedule(): void
    {
        $manager = User::factory()->management()->create();

        $this->actingAs($manager)
            ->putJson('/api/management/register-schedule', [
                'schedule_by_track' => [
                    'primary' => [
                        ['label' => 'Arrival', 'registration_enabled' => true, 'start_time' => '07:20', 'end_time' => '07:45'],
                        ['label' => 'Lunch', 'registration_enabled' => false, 'start_time' => '12:30', 'end_time' => '13:00'],
                    ],
                    'secondary' => [
                        ['label' => 'Assembly', 'registration_enabled' => true, 'start_time' => '07:30', 'end_time' => '08:00'],
                        ['label' => 'Period 2', 'registration_enabled' => true, 'start_time' => '10:00', 'end_time' => '11:00'],
                    ],
                ],
            ])
            ->assertOk()
            ->assertJsonPath('scheduleByTrack.primary.0.label', 'Arrival')
            ->assertJsonPath('scheduleByTrack.primary.0.start_time', '07:20')
            ->assertJsonPath('scheduleByTrack.secondary.1.registration_enabled', true);

        $this->assertSame([
            'primary' => [
                ['label' => 'Arrival', 'registration_enabled' => true, 'start_time' => '07:20', 'end_time' => '07:45'],
                ['label' => 'Lunch', 'registration_enabled' => false, 'start_time' => '12:30', 'end_time' => '13:00'],
            ],
            'secondary' => [
                ['label' => 'Assembly', 'registration_enabled' => true, 'start_time' => '07:30', 'end_time' => '08:00'],
                ['label' => 'Period 2', 'registration_enabled' => true, 'start_time' => '10:00', 'end_time' => '11:00'],
            ],
        ], SchoolSetting::query()->where('key', 'register_schedule')->firstOrFail()->value);
    }
}
