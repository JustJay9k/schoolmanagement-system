<?php

namespace Tests\Feature\Teacher;

use App\Models\School;
use App\Models\SchoolGradeBand;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class GradeBandsTest extends TestCase
{
    use RefreshDatabase;

    private School $school;

    private User $teacher;

    private User $headTeacher;

    protected function setUp(): void
    {
        parent::setUp();

        $this->school = School::query()->create([
            'name' => 'Zomba Academy',
        ]);

        $this->teacher = User::factory()->teacher()->create([
            'school_id' => $this->school->id,
            'school_track' => 'primary',
            'assigned_class_name' => 'Standard 3',
        ]);

        $this->headTeacher = User::factory()->management()->create([
            'school_id' => $this->school->id,
        ]);
    }

    public function test_gradebook_returns_no_bands_until_the_school_defines_them(): void
    {
        $this->actingAs($this->teacher)
            ->getJson('/api/teacher/gradebook')
            ->assertOk()
            ->assertJsonPath('options.gradeBands', []);
    }

    public function test_teacher_can_define_a_grade_band(): void
    {
        $this->actingAs($this->teacher)
            ->postJson('/api/teacher/grade-bands', [
                'letter' => 'a',
                'min_percentage' => 90,
                'max_percentage' => 100,
            ])
            ->assertCreated()
            ->assertJsonFragment([
                'letter' => 'A',
                'min_percentage' => 90,
                'max_percentage' => 100,
            ]);

        $this->assertDatabaseHas('school_grade_bands', [
            'school_id' => $this->school->id,
            'letter' => 'A',
            'min_percentage' => 90,
            'max_percentage' => 100,
        ]);
    }

    public function test_grade_book_options_use_customised_bands_once_defined(): void
    {
        SchoolGradeBand::query()->create([
            'school_id' => $this->school->id,
            'letter' => 'A',
            'min_percentage' => 75,
            'max_percentage' => 100,
            'created_by' => $this->teacher->id,
        ]);

        $this->actingAs($this->teacher)
            ->getJson('/api/teacher/grade-bands')
            ->assertOk()
            ->assertJsonCount(1, 'gradeBands')
            ->assertJsonFragment([
                'letter' => 'A',
                'min_percentage' => 75,
                'max_percentage' => 100,
            ]);

        $this->actingAs($this->teacher)
            ->getJson('/api/teacher/gradebook')
            ->assertOk()
            ->assertJsonPath('options.gradeBands.0.letter', 'A')
            ->assertJsonPath('options.gradeBands.0.min_percentage', 75)
            ->assertJsonPath('options.gradeBands.0.max_percentage', 100);
    }

    public function test_bands_are_isolated_between_schools(): void
    {
        $otherSchool = School::query()->create([
            'name' => 'Dedza High',
        ]);

        $band = SchoolGradeBand::query()->create([
            'school_id' => $otherSchool->id,
            'letter' => 'A',
            'min_percentage' => 85,
            'max_percentage' => 100,
        ]);

        $this->actingAs($this->teacher)
            ->putJson("/api/teacher/grade-bands/{$band->id}", [
                'letter' => 'A',
                'min_percentage' => 90,
                'max_percentage' => 100,
            ])
            ->assertNotFound();

        $this->actingAs($this->teacher)
            ->deleteJson("/api/teacher/grade-bands/{$band->id}")
            ->assertNotFound();
    }

    public function test_grades_need_letter_and_a_valid_percentage_range(): void
    {
        $this->actingAs($this->teacher)
            ->postJson('/api/teacher/grade-bands', [
                'letter' => 'A',
                'min_percentage' => 95,
                'max_percentage' => 90,
            ])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['max_percentage']);

        $this->actingAs($this->teacher)
            ->postJson('/api/teacher/grade-bands', [
                'letter' => '',
                'min_percentage' => 0,
                'max_percentage' => 100,
            ])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['letter']);
    }

    public function test_head_teacher_can_manage_grade_bands_too(): void
    {
        $this->actingAs($this->headTeacher)
            ->postJson('/api/teacher/grade-bands', [
                'letter' => 'P',
                'min_percentage' => 50,
                'max_percentage' => 100,
            ])
            ->assertCreated();

        $this->actingAs($this->headTeacher)
            ->getJson('/api/teacher/grade-bands')
            ->assertOk()
            ->assertJsonCount(1, 'gradeBands')
            ->assertJsonFragment(['letter' => 'P']);
    }
}