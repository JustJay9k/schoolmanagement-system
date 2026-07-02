<?php

namespace Tests\Feature\Teacher;

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
        ]);

        $guardian->update([
            'linked_student_record_id' => $student->id,
        ]);

        $this->actingAs($teacher)
            ->getJson('/api/teacher/gradebook')
            ->assertOk()
            ->assertJsonPath('students.0.full_name', 'Agnes Chirwa')
            ->assertJsonCount(2, 'options.subjectsByTrack.primary');

        $this->actingAs($teacher)
            ->putJson("/api/teacher/gradebook/students/{$student->id}/performance", [
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
            ->assertJsonPath('student.performance.subject_grades.0.subject_name', 'English')
            ->assertJsonPath('student.performance.subject_grades.0.grade', 'A')
            ->assertJsonPath('student.performance.subject_grades.1.subject_name', 'Mathematics')
            ->assertJsonPath('student.performance.subject_grades.1.grade', '82%');

        $this->assertDatabaseHas('student_performance_records', [
            'student_record_id' => $student->id,
            'teacher_id' => $teacher->id,
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
}
