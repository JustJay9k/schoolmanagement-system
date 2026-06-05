<?php

namespace Tests\Feature\Admin;

use App\Models\SchoolSetting;
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
            ->get('/admin/school-structure')
            ->assertOk()
            ->assertSee('School Structure')
            ->assertSee('Standard 1')
            ->assertSee('Form 4');
    }

    public function test_admin_can_update_school_structure(): void
    {
        $admin = User::factory()->admin()->create();

        $this->actingAs($admin)
            ->put('/admin/school-structure', [
                'primary_classes' => "Reception\nStandard 1\nStandard 2",
                'secondary_classes' => "Form A\nForm B",
            ])
            ->assertRedirect('/admin/school-structure');

        $this->assertDatabaseHas('school_settings', [
            'key' => 'school_structure',
        ]);

        $this->assertSame([
            'primary' => ['Reception', 'Standard 1', 'Standard 2'],
            'secondary' => ['Form A', 'Form B'],
        ], SchoolSetting::query()->where('key', 'school_structure')->firstOrFail()->value);
    }

    public function test_school_structure_update_cannot_remove_a_class_that_is_already_assigned(): void
    {
        $admin = User::factory()->admin()->create();

        User::factory()->teacher()->create([
            'school_track' => 'primary',
            'assigned_class_name' => 'Standard 3',
        ]);

        $this->actingAs($admin)
            ->put('/admin/school-structure', [
                'primary_classes' => "Standard 1\nStandard 2",
                'secondary_classes' => "Form 1\nForm 2\nForm 3\nForm 4",
            ])
            ->assertSessionHasErrors('classes_by_track');
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
