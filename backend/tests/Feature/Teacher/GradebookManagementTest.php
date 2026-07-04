<?php

namespace Tests\Feature\Teacher;

use App\Models\GradeAssessmentPeriod;
use App\Models\School;
use App\Models\SchoolSubject;
use App\Models\StudentRecord;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class GradebookManagementTest extends TestCase
{
    use RefreshDatabase;

    public function test_teacher_can_view_and_update_gradebook_records_for_their_class(): void
    {
        $school = School::query()->create([
            'name' => 'Mulanje Academy',
        ]);

        $teacher = User::factory()->teacher()->create([
            'school_id' => $school->id,
            'school_track' => 'primary',
            'assigned_class_name' => 'Standard 4',
        ]);

        $midTerm = GradeAssessmentPeriod::query()->create([
            'school_id' => $school->id,
            'name' => 'Mid Term Results',
            'position' => 1,
        ]);

        $mathematics = SchoolSubject::query()->create([
            'name' => 'Mathematics',
            'code' => 'MTH',
            'school_track' => 'primary',
        ]);

        $english = SchoolSubject::query()->create([
            'name' => 'English',
            'code' => 'ENG',
            'school_track' => 'primary',
        ]);

        $guardian = User::factory()->guardian()->create([
            'school_id' => $school->id,
        ]);

        $student = StudentRecord::query()->create([
            'school_id' => $school->id,
            'school_track' => 'primary',
            'class_name' => 'Standard 4',
            'full_name' => 'Agnes Chirwa',
            'sex' => 'Female',
            'date_of_birth' => '2014-05-02',
            'disability_name' => 'Visual impairment',
        ]);

        $guardian->update([
            'linked_student_record_id' => $student->id,
        ]);

        $this->actingAs($teacher)
            ->getJson('/api/teacher/gradebook')
            ->assertOk()
            ->assertJsonPath('students.0.full_name', 'Agnes Chirwa')
            ->assertJsonPath('students.0.sex', 'Female')
            ->assertJsonPath('students.0.date_of_birth', '2014-05-02')
            ->assertJsonPath('students.0.disability_name', 'Visual impairment')
            ->assertJsonPath('options.registerScheduleByTrack.primary.0.label', 'AM')
            ->assertJsonCount(2, 'options.subjectsByTrack.primary')
            ->assertJsonCount(1, 'options.assessmentPeriods');

        $this->actingAs($teacher)
            ->putJson("/api/teacher/gradebook/students/{$student->id}/performance", [
                'assessment_period_id' => $midTerm->id,
                'subject_grades' => [
                    [
                        'subject_id' => $mathematics->id,
                        'grade' => '82%',
                    ],
                    [
                        'subject_id' => $english->id,
                        'grade' => 'A',
                    ],
                ],
                'comment' => 'Strong progress in literacy and class participation.',
            ])
            ->assertOk()
            ->assertJsonPath('student.performances.0.assessment_period_name', 'Mid Term Results')
            ->assertJsonPath('student.performances.0.subject_grades.0.subject_name', 'English')
            ->assertJsonPath('student.performances.0.subject_grades.0.grade', 'A')
            ->assertJsonPath('student.performances.0.subject_grades.1.subject_name', 'Mathematics')
            ->assertJsonPath('student.performances.0.subject_grades.1.grade', '82%');

        $this->assertDatabaseHas('student_performance_records', [
            'student_record_id' => $student->id,
            'teacher_id' => $teacher->id,
            'assessment_period_id' => $midTerm->id,
            'grade' => 'English: A; Mathematics: 82%',
        ]);

        $this->assertDatabaseHas('user_notifications', [
            'user_id' => $guardian->id,
            'title' => 'New learner update available',
        ]);
    }

    public function test_teacher_must_submit_all_subject_grades_for_the_student_track(): void
    {
        $school = School::query()->create([
            'name' => 'Mulanje Academy',
        ]);

        $teacher = User::factory()->teacher()->create([
            'school_id' => $school->id,
            'school_track' => 'primary',
            'assigned_class_name' => 'Standard 4',
        ]);

        $midTerm = GradeAssessmentPeriod::query()->create([
            'school_id' => $school->id,
            'name' => 'Mid Term Results',
            'position' => 1,
        ]);

        $mathematics = SchoolSubject::query()->create([
            'name' => 'Mathematics',
            'code' => 'MTH',
            'school_track' => 'primary',
        ]);

        SchoolSubject::query()->create([
            'name' => 'English',
            'code' => 'ENG',
            'school_track' => 'primary',
        ]);

        $student = StudentRecord::query()->create([
            'school_id' => $school->id,
            'school_track' => 'primary',
            'class_name' => 'Standard 4',
            'full_name' => 'Agnes Chirwa',
        ]);

        $this->actingAs($teacher)
            ->putJson("/api/teacher/gradebook/students/{$student->id}/performance", [
                'assessment_period_id' => $midTerm->id,
                'subject_grades' => [
                    [
                        'subject_id' => $mathematics->id,
                        'grade' => '82%',
                    ],
                ],
                'comment' => 'Missing one subject grade.',
            ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['subject_grades']);
    }

    public function test_teacher_can_save_multiple_assessment_period_records_for_the_same_student(): void
    {
        $school = School::query()->create([
            'name' => 'Mulanje Academy',
        ]);

        $teacher = User::factory()->teacher()->create([
            'school_id' => $school->id,
            'school_track' => 'primary',
            'assigned_class_name' => 'Standard 4',
        ]);

        $midTerm = GradeAssessmentPeriod::query()->create([
            'school_id' => $school->id,
            'name' => 'Mid Term Results',
            'position' => 1,
        ]);

        $endTerm = GradeAssessmentPeriod::query()->create([
            'school_id' => $school->id,
            'name' => 'End of Term Results',
            'position' => 2,
        ]);

        $mathematics = SchoolSubject::query()->create([
            'name' => 'Mathematics',
            'code' => 'MTH',
            'school_track' => 'primary',
        ]);

        $english = SchoolSubject::query()->create([
            'name' => 'English',
            'code' => 'ENG',
            'school_track' => 'primary',
        ]);

        $student = StudentRecord::query()->create([
            'school_id' => $school->id,
            'school_track' => 'primary',
            'class_name' => 'Standard 4',
            'full_name' => 'Agnes Chirwa',
        ]);

        $this->actingAs($teacher)
            ->putJson("/api/teacher/gradebook/students/{$student->id}/performance", [
                'assessment_period_id' => $midTerm->id,
                'subject_grades' => [
                    ['subject_id' => $mathematics->id, 'grade' => '72%'],
                    ['subject_id' => $english->id, 'grade' => 'B'],
                ],
                'comment' => 'Mid-term performance recorded.',
            ])
            ->assertOk();

        $this->actingAs($teacher)
            ->putJson("/api/teacher/gradebook/students/{$student->id}/performance", [
                'assessment_period_id' => $endTerm->id,
                'subject_grades' => [
                    ['subject_id' => $mathematics->id, 'grade' => '80%'],
                    ['subject_id' => $english->id, 'grade' => 'A'],
                ],
                'comment' => 'End of term performance recorded.',
            ])
            ->assertOk()
            ->assertJsonCount(2, 'student.performances');

        $this->assertDatabaseCount('student_performance_records', 2);
    }

    public function test_head_teacher_and_teacher_share_the_same_period_grade_record(): void
    {
        $school = School::query()->create([
            'name' => 'Mulanje Academy',
        ]);

        $headTeacher = User::factory()->management()->create([
            'school_id' => $school->id,
        ]);

        $teacher = User::factory()->teacher()->create([
            'school_id' => $school->id,
            'school_track' => 'primary',
            'assigned_class_name' => 'Standard 4',
        ]);

        $midTerm = GradeAssessmentPeriod::query()->create([
            'school_id' => $school->id,
            'name' => 'Mid Term Results',
            'position' => 1,
        ]);

        $mathematics = SchoolSubject::query()->create([
            'name' => 'Mathematics',
            'code' => 'MTH',
            'school_track' => 'primary',
        ]);

        $english = SchoolSubject::query()->create([
            'name' => 'English',
            'code' => 'ENG',
            'school_track' => 'primary',
        ]);

        $student = StudentRecord::query()->create([
            'school_id' => $school->id,
            'school_track' => 'primary',
            'class_name' => 'Standard 4',
            'full_name' => 'Agnes Chirwa',
        ]);

        $this->actingAs($headTeacher)
            ->putJson("/api/teacher/gradebook/students/{$student->id}/performance", [
                'assessment_period_id' => $midTerm->id,
                'subject_grades' => [
                    ['subject_id' => $mathematics->id, 'grade' => '78%'],
                    ['subject_id' => $english->id, 'grade' => 'B'],
                ],
                'comment' => 'Head teacher entered the first record.',
            ])
            ->assertOk();

        $this->actingAs($teacher)
            ->getJson('/api/teacher/gradebook')
            ->assertOk()
            ->assertJsonPath('students.0.performances.0.assessment_period_name', 'Mid Term Results')
            ->assertJsonPath('students.0.performances.0.subject_grades.0.grade', 'B')
            ->assertJsonPath(
                'students.0.performances.0.comment',
                'Head teacher entered the first record.',
            );

        $this->actingAs($teacher)
            ->putJson("/api/teacher/gradebook/students/{$student->id}/performance", [
                'assessment_period_id' => $midTerm->id,
                'subject_grades' => [
                    ['subject_id' => $mathematics->id, 'grade' => '84%'],
                    ['subject_id' => $english->id, 'grade' => 'A'],
                ],
                'comment' => 'Teacher updated the shared record.',
            ])
            ->assertOk()
            ->assertJsonPath('student.performances.0.subject_grades.0.grade', 'A')
            ->assertJsonPath('student.performances.0.subject_grades.1.grade', '84%')
            ->assertJsonPath(
                'student.performances.0.comment',
                'Teacher updated the shared record.',
            );

        $this->assertDatabaseCount('student_performance_records', 1);
        $this->assertDatabaseHas('student_performance_records', [
            'student_record_id' => $student->id,
            'assessment_period_id' => $midTerm->id,
            'teacher_id' => $teacher->id,
            'grade' => 'English: A; Mathematics: 84%',
            'comment' => 'Teacher updated the shared record.',
        ]);
    }
}
