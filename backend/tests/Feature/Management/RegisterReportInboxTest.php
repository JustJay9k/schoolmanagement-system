<?php

namespace Tests\Feature\Management;

use App\Models\RegisterReport;
use App\Models\School;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class RegisterReportInboxTest extends TestCase
{
    use RefreshDatabase;

    public function test_head_teacher_only_sees_register_reports_from_their_school(): void
    {
        $schoolA = School::query()->create(['name' => 'Mulanje Academy']);
        $schoolB = School::query()->create(['name' => 'Thyolo Academy']);

        $headTeacher = User::factory()->management()->create([
            'school_id' => $schoolA->id,
        ]);

        $teacherA = User::factory()->teacher()->create([
            'school_id' => $schoolA->id,
        ]);

        $teacherB = User::factory()->teacher()->create([
            'school_id' => $schoolB->id,
        ]);

        RegisterReport::query()->create([
            'school_id' => $schoolA->id,
            'teacher_id' => $teacherA->id,
            'teacher_name' => 'Teacher A',
            'school_track' => 'secondary',
            'class_name' => 'Form 2',
            'report_date' => now()->toDateString(),
            'status' => 'submitted',
            'submitted_at' => now(),
            'periods' => [['label' => 'AM']],
            'entries' => [['student_id' => 1, 'student_name' => 'A learner', 'student_code' => 'A1', 'status' => 'P', 'note' => '']],
            'summary' => ['total_students' => 1, 'counts' => ['P' => 1, 'L' => 0, 'S' => 0, 'A' => 0, 'E' => 0]],
        ]);

        RegisterReport::query()->create([
            'school_id' => $schoolB->id,
            'teacher_id' => $teacherB->id,
            'teacher_name' => 'Teacher B',
            'school_track' => 'secondary',
            'class_name' => 'Form 2',
            'report_date' => now()->toDateString(),
            'status' => 'submitted',
            'submitted_at' => now(),
            'periods' => [['label' => 'AM']],
            'entries' => [['student_id' => 2, 'student_name' => 'B learner', 'student_code' => 'B1', 'status' => 'A', 'note' => '']],
            'summary' => ['total_students' => 1, 'counts' => ['P' => 0, 'L' => 0, 'S' => 0, 'A' => 1, 'E' => 0]],
        ]);

        $this->actingAs($headTeacher)
            ->getJson('/api/management/register-reports')
            ->assertOk()
            ->assertJsonCount(1, 'reports')
            ->assertJsonPath('reports.0.teacher_id', $teacherA->id)
            ->assertJsonCount(1, 'teachers')
            ->assertJsonPath('teachers.0.id', $teacherA->id);
    }
}
