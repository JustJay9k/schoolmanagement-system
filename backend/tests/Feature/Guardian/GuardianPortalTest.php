<?php

namespace Tests\Feature\Guardian;

use App\Models\School;
use App\Models\StudentPerformanceRecord;
use App\Models\StudentRecord;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class GuardianPortalTest extends TestCase
{
    use RefreshDatabase;

    public function test_guardian_can_view_linked_child_information_and_teacher_updates(): void
    {
        $school = School::query()->create([
            'name' => 'Kasungu Academy',
        ]);

        $teacher = User::factory()->teacher()->create([
            'school_id' => $school->id,
            'school_track' => 'secondary',
            'assigned_class_name' => 'Form 2',
        ]);

        $student = StudentRecord::query()->create([
            'school_id' => $school->id,
            'school_track' => 'secondary',
            'class_name' => 'Form 2',
            'full_name' => 'Brian Chirwa',
            'guardian_name' => 'Mr Chirwa',
        ]);

        StudentPerformanceRecord::query()->create([
            'student_record_id' => $student->id,
            'teacher_id' => $teacher->id,
            'grade' => 'A',
            'comment' => 'Consistent work across the term.',
        ]);

        $guardian = User::factory()->guardian()->create([
            'school_id' => $school->id,
            'linked_student_record_id' => $student->id,
        ]);

        $this->actingAs($guardian)
            ->getJson('/api/guardian/child')
            ->assertOk()
            ->assertJsonPath('child.full_name', 'Brian Chirwa')
            ->assertJsonPath('child.performance_records.0.grade', 'A')
            ->assertJsonPath(
                'child.performance_records.0.comment',
                'Consistent work across the term.',
            );
    }
}
