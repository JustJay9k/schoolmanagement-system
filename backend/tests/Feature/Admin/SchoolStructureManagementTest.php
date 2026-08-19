<?php

namespace Tests\Feature\Admin;

use App\Models\School;
use App\Models\SchoolSetting;
use App\Models\Timetable;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SchoolStructureManagementTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_can_view_school_structure_page(): void
    {
        $school = School::query()->create(['name' => 'Admin School']);
        $admin = User::factory()->admin()->create([
            'school_id' => $school->id,
        ]);

        $this->actingAs($admin)
            ->getJson('/api/admin/school-structure')
            ->assertOk()
            ->assertJsonPath('classesByTrack.primary.0', 'Standard 1')
            ->assertJsonPath('classesByTrack.secondary.3', 'Form 4');
    }

    public function test_admin_can_update_school_structure(): void
    {
        $school = School::query()->create(['name' => 'Admin School']);
        $admin = User::factory()->admin()->create([
            'school_id' => $school->id,
        ]);

        $this->actingAs($admin)
            ->putJson('/api/admin/school-structure', [
                'primary_classes' => "Reception\nStandard 1\nStandard 2",
                'secondary_classes' => "Form A\nForm B",
            ])
            ->assertOk();

        $this->assertDatabaseHas('school_settings', [
            'school_id' => $school->id,
            'key' => 'school_structure',
        ]);

        $this->assertSame([
            'primary' => ['Reception', 'Standard 1', 'Standard 2'],
            'secondary' => ['Form A', 'Form B'],
        ], SchoolSetting::query()
            ->where('school_id', $school->id)
            ->where('key', 'school_structure')
            ->firstOrFail()
            ->value);
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
        ], SchoolSetting::query()
            ->where('school_id', $school->id)
            ->where('key', 'school_structure')
            ->firstOrFail()
            ->value);
    }

    public function test_school_structures_are_isolated_by_school(): void
    {
        $schoolA = School::query()->create(['name' => 'North Campus']);
        $schoolB = School::query()->create(['name' => 'South Campus']);
        $headTeacherA = User::factory()->management()->create([
            'school_id' => $schoolA->id,
        ]);
        $headTeacherB = User::factory()->management()->create([
            'school_id' => $schoolB->id,
        ]);

        $this->actingAs($headTeacherA)
            ->putJson('/api/management/school-structure', [
                'primary_classes' => "Infant 1\nInfant 2",
                'secondary_classes' => "Junior 1\nJunior 2",
            ])
            ->assertOk();

        $this->actingAs($headTeacherB)
            ->putJson('/api/management/school-structure', [
                'primary_classes' => "Standard A\nStandard B",
                'secondary_classes' => "Senior A\nSenior B",
            ])
            ->assertOk();

        $this->actingAs($headTeacherA)
            ->getJson('/api/management/school-structure')
            ->assertOk()
            ->assertJsonPath('classesByTrack.primary', ['Infant 1', 'Infant 2'])
            ->assertJsonPath('classesByTrack.secondary', ['Junior 1', 'Junior 2']);

        $this->actingAs($headTeacherB)
            ->getJson('/api/management/school-structure')
            ->assertOk()
            ->assertJsonPath('classesByTrack.primary', ['Standard A', 'Standard B'])
            ->assertJsonPath('classesByTrack.secondary', ['Senior A', 'Senior B']);
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
        $school = School::query()->create(['name' => 'Admin School']);
        $admin = User::factory()->admin()->create([
            'school_id' => $school->id,
        ]);

        User::factory()->teacher()->create([
            'school_id' => $school->id,
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
        $school = School::query()->create(['name' => 'Admin School']);
        $admin = User::factory()->admin()->create([
            'school_id' => $school->id,
        ]);

        Timetable::query()->create([
            'title' => 'Form 2 Timetable',
            'school_track' => 'secondary',
            'class_name' => 'Form 2',
            'created_by' => $admin->id,
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
        $schoolA = School::query()->create(['name' => 'North Campus']);
        $schoolB = School::query()->create(['name' => 'South Campus']);

        SchoolSetting::query()->create([
            'school_id' => $schoolA->id,
            'key' => 'school_structure',
            'value' => [
                'primary' => ['Standard A', 'Standard B'],
                'secondary' => ['Form East', 'Form West'],
            ],
        ]);

        SchoolSetting::query()->create([
            'school_id' => $schoolB->id,
            'key' => 'school_structure',
            'value' => [
                'primary' => ['Prep 1', 'Prep 2'],
                'secondary' => ['Level 1', 'Level 2'],
            ],
        ]);

        $this->get('/register/options')
            ->assertOk()
            ->assertJsonPath('tracks.primary', 'Primary')
            ->assertJsonPath("classesByTrackBySchool.{$schoolA->id}.primary", ['Standard A', 'Standard B'])
            ->assertJsonPath("classesByTrackBySchool.{$schoolA->id}.secondary", ['Form East', 'Form West'])
            ->assertJsonPath("classesByTrackBySchool.{$schoolB->id}.primary", ['Prep 1', 'Prep 2'])
            ->assertJsonPath("classesByTrackBySchool.{$schoolB->id}.secondary", ['Level 1', 'Level 2']);
    }
}
