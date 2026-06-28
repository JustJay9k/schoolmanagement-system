<?php

namespace Tests\Feature\Teacher;

use App\Models\School;
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
            ->assertJsonPath('students.0.full_name', 'Agnes Chirwa');

        $this->actingAs($teacher)
            ->putJson("/api/teacher/gradebook/students/{$student->id}/performance", [
                'grade' => '82%',
                'comment' => 'Strong progress in literacy and class participation.',
            ])
            ->assertOk()
            ->assertJsonPath('student.performance.grade', '82%');

        $this->assertDatabaseHas('student_performance_records', [
            'student_record_id' => $student->id,
            'teacher_id' => $teacher->id,
            'grade' => '82%',
        ]);

        $this->assertDatabaseHas('user_notifications', [
            'user_id' => $guardian->id,
            'title' => 'New learner update available',
        ]);
    }
}
