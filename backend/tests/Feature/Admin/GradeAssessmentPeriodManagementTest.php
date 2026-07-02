<?php

namespace Tests\Feature\Admin;

use App\Models\GradeAssessmentPeriod;
use App\Models\School;
use App\Models\StudentPerformanceRecord;
use App\Models\StudentRecord;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class GradeAssessmentPeriodManagementTest extends TestCase
{
    use RefreshDatabase;

    public function test_management_user_can_create_list_and_delete_grade_assessment_periods(): void
    {
        $school = School::query()->create([
            'name' => 'Mponela Academy',
        ]);

        $headTeacher = User::factory()->management()->create([
            'school_id' => $school->id,
        ]);

        $this->actingAs($headTeacher)
            ->postJson('/api/management/gradebook-assessment-periods', [
                'name' => 'Mid Term Results',
            ])
            ->assertCreated()
            ->assertJsonPath('period.name', 'Mid Term Results');

        $period = GradeAssessmentPeriod::query()->firstOrFail();

        $this->actingAs($headTeacher)
            ->getJson('/api/management/gradebook-assessment-periods')
            ->assertOk()
            ->assertJsonPath('periods.0.name', 'Mid Term Results');

        $this->actingAs($headTeacher)
            ->deleteJson("/api/management/gradebook-assessment-periods/{$period->id}")
            ->assertOk();

        $this->assertDatabaseMissing('grade_assessment_periods', [
            'id' => $period->id,
        ]);
    }

    public function test_management_user_cannot_delete_a_grade_assessment_period_that_has_records(): void
    {
        $school = School::query()->create([
            'name' => 'Mponela Academy',
        ]);

        $headTeacher = User::factory()->management()->create([
            'school_id' => $school->id,
        ]);

        $teacher = User::factory()->teacher()->create([
            'school_id' => $school->id,
            'school_track' => 'primary',
            'assigned_class_name' => 'Standard 3',
        ]);

        $student = StudentRecord::query()->create([
            'school_id' => $school->id,
            'school_track' => 'primary',
            'class_name' => 'Standard 3',
            'full_name' => 'Chikondi Banda',
        ]);

        $period = GradeAssessmentPeriod::query()->create([
            'school_id' => $school->id,
            'name' => 'End of Term Results',
            'position' => 1,
        ]);

        StudentPerformanceRecord::query()->create([
            'student_record_id' => $student->id,
            'teacher_id' => $teacher->id,
            'assessment_period_id' => $period->id,
            'grade' => 'General: A',
            'subject_grades' => [
                [
                    'subject_id' => 1,
                    'subject_name' => 'General',
                    'subject_code' => null,
                    'grade' => 'A',
                ],
            ],
            'comment' => 'Recorded.',
        ]);

        $this->actingAs($headTeacher)
            ->deleteJson("/api/management/gradebook-assessment-periods/{$period->id}")
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['period']);
    }
}
