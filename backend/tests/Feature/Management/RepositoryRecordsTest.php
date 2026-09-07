<?php

namespace Tests\Feature\Management;

use App\Models\GradeAssessmentPeriod;
use App\Models\School;
use App\Models\SchoolSubject;
use App\Models\StudentPerformanceRecord;
use App\Models\StudentRecord;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class RepositoryRecordsTest extends TestCase
{
    use RefreshDatabase;

    private School $school;

    private User $teacher;

    private User $headTeacher;

    private StudentRecord $student;

    private GradeAssessmentPeriod $midTerm;

    private int $mathsId;

    protected function setUp(): void
    {
        parent::setUp();

        $this->school = School::query()->create(['name' => 'Lingadzi Academia']);

        $this->teacher = User::factory()->teacher()->create([
            'school_id' => $this->school->id,
            'school_track' => 'primary',
            'assigned_class_name' => 'Standard 3',
        ]);

        $this->headTeacher = User::factory()->management()->create([
            'school_id' => $this->school->id,
        ]);

        $this->student = StudentRecord::query()->create([
            'school_id' => $this->school->id,
            'school_track' => 'primary',
            'class_name' => 'Standard 3',
            'full_name' => 'Thoko Mbewe',
        ]);

        $this->midTerm = GradeAssessmentPeriod::query()->create([
            'school_id' => $this->school->id,
            'name' => 'Mid Term Results',
            'position' => 1,
        ]);

        $maths = SchoolSubject::query()->create([
            'school_id' => $this->school->id,
            'school_track' => 'primary',
            'name' => 'Mathematics',
            'code' => 'MTH',
        ]);
        $this->mathsId = $maths->id;
    }

    public function test_repository_lists_students_with_term_averages(): void
    {
        StudentPerformanceRecord::query()->create([
            'student_record_id' => $this->student->id,
            'teacher_id' => $this->teacher->id,
            'assessment_period_id' => $this->midTerm->id,
            'term' => 'first',
            'grade' => '80%',
            'subject_grades' => [
                ['subject_id' => $this->mathsId, 'subject_name' => 'Mathematics', 'grade' => '80%', 'remarks' => ''],
            ],
            'status' => StudentPerformanceRecord::STATUS_APPROVED,
        ]);

        $this->actingAs($this->headTeacher)
            ->getJson('/api/management/repository-records')
            ->assertOk()
            ->assertJsonCount(1, 'students')
            ->assertJsonPath('students.0.full_name', 'Thoko Mbewe')
            ->assertJsonPath('students.0.term_averages.first', 80)
            ->assertJsonPath('students.0.term_averages.third', null)
            ->assertJsonPath('students.0.overall_average', 80)
            ->assertJsonCount(1, 'students.0.periods');
    }

    public function test_repository_keeps_grades_after_the_learner_is_promoted(): void
    {
        StudentPerformanceRecord::query()->create([
            'student_record_id' => $this->student->id,
            'teacher_id' => $this->teacher->id,
            'assessment_period_id' => $this->midTerm->id,
            'term' => 'first',
            'grade' => '72%',
            'subject_grades' => [
                ['subject_id' => $this->mathsId, 'subject_name' => 'Mathematics', 'grade' => '72%', 'remarks' => ''],
            ],
            'status' => StudentPerformanceRecord::STATUS_APPROVED,
        ]);

        $this->student->update(['class_name' => 'Standard 4']);

        $this->actingAs($this->headTeacher)
            ->getJson('/api/management/repository-records')
            ->assertOk()
            ->assertJsonPath('students.0.class_name', 'Standard 4')
            ->assertJsonPath('students.0.term_averages.first', 72)
            ->assertJsonCount(1, 'students.0.periods');
    }
}