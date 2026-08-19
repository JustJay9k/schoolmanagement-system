<?php

namespace Tests\Feature\Admin;

use App\Models\SchoolSetting;
use App\Models\School;
use App\Models\Timetable;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SchoolStructureManagementTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_can_view_school_structure_page(): void
    {
        $admin = User::factory()->admin()->create();

        $this->actingAs($admin)
            ->getJson('/api/admin/school-structure')
            ->assertOk()
            ->assertJsonPath('classesByTrack.primary.0', 'Standard 1')
            ->assertJsonPath('classesByTrack.secondary.3', 'Form 4');
    }

    public function test_admin_can_update_school_structure(): void
    {
        $admin = User::factory()->admin()->create();

        $this->actingAs($admin)
            ->putJson('/api/admin/school-structure', [
                'primary_classes' => "Reception\nStandard 1\nStandard 2",
                'secondary_classes' => "Form A\nForm B",
            ])
            ->assertOk();

        $this->assertDatabaseHas('school_settings', [
            'key' => 'school_structure',
        ]);

        $this->assertSame([
            'primary' => ['Reception', 'Standard 1', 'Standard 2'],
            'secondary' => ['Form A', 'Form B'],
        ], SchoolSetting::query()->where('key', 'school_structure')->firstOrFail()->value);
    }

    public function test_management_user_can_view_school_structure(): void
    {
        $school = School::query()->create(['name' => 'Managed School']);
        $headTeacher = User::factory()->management()->create([
            'school_id' => $school->id,
        ]);

        $this->actingAs($headTeacher)
            ->getJson('/api/management/school-structure')
            ->assertOk()
            ->assertJsonPath('classesByTrack.primary.0', 'Standard 1')
            ->assertJsonPath('classesByTrack.secondary.3', 'Form 4');
    }

    public function test_management_user_can_update_school_structure(): void
    {
        $school = School::query()->create(['name' => 'Managed School']);
        $headTeacher = User::factory()->management()->create([
            'school_id' => $school->id,
        ]);

        $this->actingAs($headTeacher)
            ->putJson('/api/management/school-structure', [
                'primary_classes' => "Reception\nStandard 1\nStandard 2",
                'secondary_classes' => "Form A\nForm B",
            ])
            ->assertOk();

        $this->assertSame([
            'primary' => ['Reception', 'Standard 1', 'Standard 2'],
            'secondary' => ['Form A', 'Form B'],
        ], SchoolSetting::query()->where('key', 'school_structure')->firstOrFail()->value);
    }

    public function test_management_user_without_a_school_cannot_manage_school_structure(): void
    {
        $headTeacher = User::factory()->management()->create([
            'school_id' => null,
        ]);

        $this->actingAs($headTeacher)
            ->getJson('/api/management/school-structure')
            ->assertForbidden();
    }

    public function test_school_structure_update_cannot_remove_a_class_that_is_already_assigned(): void
    {
        $admin = User::factory()->admin()->create();

        User::factory()->teacher()->create([
            'school_track' => 'primary',
            'assigned_class_name' => 'Standard 3',
        ]);

        $this->actingAs($admin)
            ->putJson('/api/admin/school-structure', [
                'primary_classes' => "Standard 1\nStandard 2",
                'secondary_classes' => "Form 1\nForm 2\nForm 3\nForm 4",
            ])
            ->assertStatus(422)
            ->assertJsonValidationErrors('classes_by_track');
    }

    public function test_school_structure_update_cannot_remove_a_class_that_has_a_timetable(): void
    {
        $admin = User::factory()->admin()->create();

        Timetable::query()->create([
            'title' => 'Form 2 Timetable',
            'school_track' => 'secondary',
            'class_name' => 'Form 2',
        ]);

        $this->actingAs($admin)
            ->putJson('/api/admin/school-structure', [
                'primary_classes' => "Standard 1\nStandard 2\nStandard 3",
                'secondary_classes' => "Form 1\nForm 3\nForm 4",
            ])
            ->assertStatus(422)
            ->assertJsonValidationErrors('classes_by_track');
    }

    public function test_registration_options_use_configured_school_structure(): void
    {
        SchoolSetting::query()->create([
            'key' => 'school_structure',
            'value' => [
                'primary' => ['Standard A', 'Standard B'],
                'secondary' => ['Form East', 'Form West'],
            ],
        ]);

        $this->get('/register/options')
            ->assertOk()
            ->assertJsonPath('tracks.primary', 'Primary')
            ->assertJsonPath('availableClassesByTrack.primary', ['Standard A', 'Standard B'])
            ->assertJsonPath('availableClassesByTrack.secondary', ['Form East', 'Form West']);
    }
}
