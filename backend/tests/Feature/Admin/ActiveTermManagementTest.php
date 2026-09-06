<?php

namespace Tests\Feature\Admin;

use App\Models\School;
use App\Models\SchoolSetting;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ActiveTermManagementTest extends TestCase
{
    use RefreshDatabase;

    public function test_school_structure_response_includes_the_active_term_and_term_list(): void
    {
        $school = School::query()->create(['name' => 'Admin School']);
        $admin = User::factory()->admin()->create([
            'school_id' => $school->id,
        ]);

        $this->actingAs($admin)
            ->getJson('/api/admin/school-structure')
            ->assertOk()
            ->assertJsonPath('activeTerm', 'first')
            ->assertJsonPath('terms.0.value', 'first')
            ->assertJsonPath('terms.0.label', 'First Term')
            ->assertJsonCount(3, 'terms');
    }

    public function test_management_user_can_update_the_active_term_for_their_school(): void
    {
        $school = School::query()->create(['name' => 'Managed School']);
        $headTeacher = User::factory()->management()->create([
            'school_id' => $school->id,
        ]);

        $this->actingAs($headTeacher)
            ->putJson('/api/management/school-structure/active-term', [
                'term' => 'second',
            ])
            ->assertOk()
            ->assertJsonPath('activeTerm', 'second');

        $this->assertSame('second', SchoolSetting::query()
            ->where('school_id', $school->id)
            ->where('key', 'active_term')
            ->firstOrFail()
            ->value);

        $this->actingAs($headTeacher)
            ->getJson('/api/management/school-structure')
            ->assertOk()
            ->assertJsonPath('activeTerm', 'second');
    }

    public function test_active_term_is_isolated_to_each_school(): void
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
            ->putJson('/api/management/school-structure/active-term', [
                'term' => 'third',
            ])
            ->assertOk();

        $this->actingAs($headTeacherB)
            ->getJson('/api/management/school-structure')
            ->assertOk()
            ->assertJsonPath('activeTerm', 'first');

        $this->actingAs($headTeacherA)
            ->getJson('/api/management/school-structure')
            ->assertOk()
            ->assertJsonPath('activeTerm', 'third');
    }

    public function test_active_term_update_requires_a_valid_term(): void
    {
        $school = School::query()->create(['name' => 'Managed School']);
        $headTeacher = User::factory()->management()->create([
            'school_id' => $school->id,
        ]);

        $this->actingAs($headTeacher)
            ->putJson('/api/management/school-structure/active-term', [
                'term' => 'summer',
            ])
            ->assertStatus(422)
            ->assertJsonValidationErrors('term');
    }

    public function test_teacher_cannot_update_the_active_term(): void
    {
        $school = School::query()->create(['name' => 'Managed School']);
        $teacher = User::factory()->teacher()->create([
            'school_id' => $school->id,
        ]);

        $this->actingAs($teacher)
            ->putJson('/api/management/school-structure/active-term', [
                'term' => 'second',
            ])
            ->assertForbidden();
    }
}