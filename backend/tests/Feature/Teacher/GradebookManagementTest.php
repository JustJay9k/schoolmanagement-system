<?php

namespace Tests\Feature\Teacher;

use App\Models\GradeAssessmentPeriod;
use App\Models\School;
use App\Models\SchoolSubject;
use App\Models\StudentPerformanceRecord;
use App\Models\StudentRecord;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class GradebookManagementTest extends TestCase
{
    use RefreshDatabase;

    private School $school;

    private User $teacher;

    private User $headTeacher;

    private User $guardian;

    private StudentRecord $student;

    private GradeAssessmentPeriod $midTerm;

    private int $mathematicsId;

    private int $englishId;

    protected function setUp(): void
    {
        parent::setUp();

        $this->school = School::query()->create([
            'name' => 'Mulanje Academy',
        ]);

        $this->teacher = User::factory()->teacher()->create([
            'school_id' => $this->school->id,
            'school_track' => 'primary',
            'assigned_class_name' => 'Standard 4',
        ]);

        $this->headTeacher = User::factory()->management()->create([
            'school_id' => $this->school->id,
        ]);

        $this->guardian = User::factory()->guardian()->create([
            'school_id' => $this->school->id,
        ]);

        $this->student = StudentRecord::query()->create([
            'school_id' => $this->school->id,
            'school_track' => 'primary',
            'class_name' => 'Standard 4',
            'full_name' => 'Agnes Chirwa',
        ]);

        $this->guardian->update([
            'linked_student_record_id' => $this->student->id,
        ]);

        $this->midTerm = GradeAssessmentPeriod::query()->create([
            'school_id' => $this->school->id,
            'name' => 'Mid Term Results',
            'position' => 1,
        ]);

        $mathematics = SchoolSubject::query()->create([
            'name' => 'Mathematics',
            'code' => 'MTH',
            'school_track' => 'primary',
            'school_id' => $this->school->id,
        ]);

        $english = SchoolSubject::query()->create([
            'name' => 'English',
            'code' => 'ENG',
            'school_track' => 'primary',
            'school_id' => $this->school->id,
        ]);

        $this->mathematicsId = $mathematics->id;
        $this->englishId = $english->id;
    }

    private function saveDraft(): void
    {
        $this->actingAs($this->teacher)
            ->putJson("/api/teacher/gradebook/students/{$this->student->id}/performance", [
                'assessment_period_id' => $this->midTerm->id,
                'subject_grades' => [
                    ['subject_id' => $this->mathematicsId, 'grade' => '82%'],
                    ['subject_id' => $this->englishId, 'grade' => 'A'],
                ],
                'comment' => 'Strong progress in literacy and class participation.',
            ])
            ->assertOk()
            ->assertJsonPath('student.performances.0.status', 'draft');
    }

    public function test_teacher_can_view_and_update_gradebook_records_for_their_class(): void
    {
        $this->actingAs($this->teacher)
            ->getJson('/api/teacher/gradebook')
            ->assertOk()
            ->assertJsonPath('students.0.full_name', 'Agnes Chirwa')
            ->assertJsonPath('options.registerScheduleByTrack.primary.0.label', 'AM')
            ->assertJsonCount(2, 'options.subjectsByTrack.primary')
            ->assertJsonCount(1, 'options.assessmentPeriods');
    }

    public function test_teacher_saves_draft_then_submits_and_head_teacher_approves_for_guardians(): void
    {
        $this->saveDraft();

        $this->assertDatabaseHas('student_performance_records', [
            'student_record_id' => $this->student->id,
            'teacher_id' => $this->teacher->id,
            'assessment_period_id' => $this->midTerm->id,
            'grade' => 'English: A; Mathematics: 82%',
            'status' => 'draft',
        ]);

        $this->assertDatabaseMissing('user_notifications', [
            'title' => 'Learner results approved',
        ]);

        $this->actingAs($this->headTeacher)
            ->getJson('/api/teacher/gradebook')
            ->assertOk()
            ->assertJsonCount(0, 'students.0.performances');

        $this->actingAs($this->teacher)
            ->postJson('/api/teacher/gradebook/submit')
            ->assertOk()
            ->assertJsonPath('submitted_count', 1);

        $this->assertDatabaseHas('student_performance_records', [
            'student_record_id' => $this->student->id,
            'status' => 'submitted',
        ]);

        $this->assertDatabaseMissing('user_notifications', [
            'title' => 'Learner results approved',
        ]);

        $this->actingAs($this->headTeacher)
            ->getJson('/api/teacher/gradebook')
            ->assertOk()
            ->assertJsonCount(1, 'students.0.performances')
            ->assertJsonPath('students.0.performances.0.status', 'submitted');

        $this->actingAs($this->headTeacher)
            ->postJson('/api/management/gradebook/approve', [
                'school_track' => 'primary',
                'class_name' => 'Standard 4',
            ])
            ->assertOk()
            ->assertJsonPath('approved_count', 1);

        $this->assertDatabaseHas('user_notifications', [
            'user_id' => $this->guardian->id,
            'title' => 'Learner results approved',
        ]);

        $this->actingAs($this->guardian)
            ->getJson('/api/guardian/child')
            ->assertOk()
            ->assertJsonPath('child.performance_records.0.assessment_period_name', 'Mid Term Results')
            ->assertJsonPath('child.performance_records.0.grade_summary', 'English: A; Mathematics: 82%')
            ->assertJsonPath('child.performance_records.0.subject_grades.0.grade', 'A')
            ->assertJsonPath('child.performance_records.0.comment', 'Strong progress in literacy and class participation.')
            ->assertJsonPath('child.latest_class_position', 1)
            ->assertJsonPath('child.latest_average_score', 87.5);

        $this->actingAs($this->teacher)
            ->putJson("/api/teacher/gradebook/students/{$this->student->id}/performance", [
                'assessment_period_id' => $this->midTerm->id,
                'subject_grades' => [
                    ['subject_id' => $this->mathematicsId, 'grade' => '90%'],
                    ['subject_id' => $this->englishId, 'grade' => 'B'],
                ],
                'comment' => 'Trying to edit an approved grade.',
            ])
            ->assertStatus(422);
    }

    public function test_head_teacher_cannot_author_grades_directly(): void
    {
        $this->actingAs($this->headTeacher)
            ->putJson("/api/teacher/gradebook/students/{$this->student->id}/performance", [
                'assessment_period_id' => $this->midTerm->id,
                'subject_grades' => [
                    ['subject_id' => $this->mathematicsId, 'grade' => '78%'],
                    ['subject_id' => $this->englishId, 'grade' => 'B'],
                ],
                'comment' => 'Head teacher attempts to author.',
            ])
            ->assertForbidden();
    }

    public function test_head_teacher_can_reopen_grades_for_the_teacher_to_edit_again(): void
    {
        $this->saveDraft();

        $this->actingAs($this->teacher)
            ->postJson('/api/teacher/gradebook/submit')
            ->assertOk();

        $this->actingAs($this->headTeacher)
            ->postJson('/api/management/gradebook/approve', [
                'school_track' => 'primary',
                'class_name' => 'Standard 4',
            ])
            ->assertOk();

        $this->actingAs($this->guardian)
            ->getJson('/api/guardian/child')
            ->assertOk()
            ->assertJsonCount(1, 'child.performance_records');

        $this->actingAs($this->headTeacher)
            ->postJson('/api/management/gradebook/reopen', [
                'school_track' => 'primary',
                'class_name' => 'Standard 4',
            ])
            ->assertOk()
            ->assertJsonPath('reopened_count', 1);

        $this->assertDatabaseHas('student_performance_records', [
            'student_record_id' => $this->student->id,
            'status' => 'draft',
        ]);

        $this->actingAs($this->guardian)
            ->getJson('/api/guardian/child')
            ->assertOk()
            ->assertJsonCount(0, 'child.performance_records');

        $this->saveDraft();

        $this->assertDatabaseHas('student_performance_records', [
            'student_record_id' => $this->student->id,
            'grade' => 'English: A; Mathematics: 82%',
        ]);
    }

    public function test_teacher_must_submit_all_subject_grades_for_the_student_track(): void
    {
        $this->actingAs($this->teacher)
            ->putJson("/api/teacher/gradebook/students/{$this->student->id}/performance", [
                'assessment_period_id' => $this->midTerm->id,
                'subject_grades' => [
                    ['subject_id' => $this->mathematicsId, 'grade' => '82%'],
                ],
                'comment' => 'Missing one subject grade.',
            ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['subject_grades']);
    }

    public function test_teacher_can_save_multiple_assessment_period_records_for_the_same_student(): void
    {
        $endTerm = GradeAssessmentPeriod::query()->create([
            'school_id' => $this->school->id,
            'name' => 'End of Term Results',
            'position' => 2,
        ]);

        $this->actingAs($this->teacher)
            ->putJson("/api/teacher/gradebook/students/{$this->student->id}/performance", [
                'assessment_period_id' => $this->midTerm->id,
                'subject_grades' => [
                    ['subject_id' => $this->mathematicsId, 'grade' => '72%'],
                    ['subject_id' => $this->englishId, 'grade' => 'B'],
                ],
                'comment' => 'Mid-term performance recorded.',
            ])
            ->assertOk();

        $this->actingAs($this->teacher)
            ->putJson("/api/teacher/gradebook/students/{$this->student->id}/performance", [
                'assessment_period_id' => $endTerm->id,
                'subject_grades' => [
                    ['subject_id' => $this->mathematicsId, 'grade' => '80%'],
                    ['subject_id' => $this->englishId, 'grade' => 'A'],
                ],
                'comment' => 'End of term performance recorded.',
            ])
            ->assertOk()
            ->assertJsonCount(2, 'student.performances');

        $this->assertDatabaseCount('student_performance_records', 2);
    }

    public function test_teacher_cannot_submit_while_any_learner_is_missing_grades(): void
    {
        $secondStudent = StudentRecord::query()->create([
            'school_id' => $this->school->id,
            'school_track' => 'primary',
            'class_name' => 'Standard 4',
            'full_name' => 'Blessings Phiri',
        ]);

        $this->actingAs($this->teacher)
            ->putJson("/api/teacher/gradebook/students/{$this->student->id}/performance", [
                'assessment_period_id' => $this->midTerm->id,
                'subject_grades' => [
                    ['subject_id' => $this->mathematicsId, 'grade' => '82%'],
                    ['subject_id' => $this->englishId, 'grade' => 'A'],
                ],
                'comment' => 'Graded learner one.',
            ])
            ->assertOk();

        $this->actingAs($this->teacher)
            ->postJson('/api/teacher/gradebook/submit')
            ->assertStatus(422)
            ->assertJsonPath('message', 'Grades are still missing for Blessings Phiri. Fill in every subject grade for all learners before submitting.');

        $this->actingAs($this->teacher)
            ->putJson("/api/teacher/gradebook/students/{$secondStudent->id}/performance", [
                'assessment_period_id' => $this->midTerm->id,
                'subject_grades' => [
                    ['subject_id' => $this->mathematicsId, 'grade' => '68%'],
                    ['subject_id' => $this->englishId, 'grade' => 'C'],
                ],
                'comment' => 'Graded learner two.',
            ])
            ->assertOk();

        $this->actingAs($this->teacher)
            ->postJson('/api/teacher/gradebook/submit')
            ->assertOk()
            ->assertJsonPath('submitted_count', 2);
    }
}
