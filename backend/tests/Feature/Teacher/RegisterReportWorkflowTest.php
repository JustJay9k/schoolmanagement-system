<?php

namespace Tests\Feature\Teacher;

use App\Models\RegisterReport;
use App\Models\School;
use App\Models\StudentRecord;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class RegisterReportWorkflowTest extends TestCase
{
    use RefreshDatabase;

    public function test_teacher_can_save_edit_and_submit_a_register_report(): void
    {
        $school = School::query()->create([
            'name' => 'Mulanje Academy',
        ]);

        $teacher = User::factory()->teacher()->create([
            'school_id' => $school->id,
            'school_track' => 'primary',
            'assigned_class_name' => 'Standard 4',
        ]);

        $headTeacher = User::factory()->management()->create([
            'school_id' => $school->id,
        ]);

        $firstStudent = StudentRecord::query()->create([
            'school_id' => $school->id,
            'school_track' => 'primary',
            'class_name' => 'Standard 4',
            'full_name' => 'Agnes Chirwa',
            'student_code' => 'S001',
        ]);

        $secondStudent = StudentRecord::query()->create([
            'school_id' => $school->id,
            'school_track' => 'primary',
            'class_name' => 'Standard 4',
            'full_name' => 'Blessings Banda',
            'student_code' => 'S002',
        ]);

        $payload = [
            'school_track' => 'primary',
            'class_name' => 'Standard 4',
            'periods' => [
                ['label' => 'AM', 'start_time' => '07:30', 'end_time' => '08:00'],
                ['label' => 'PM', 'start_time' => '13:00', 'end_time' => '13:15'],
            ],
            'entries' => [
                [
                    'student_id' => $firstStudent->id,
                    'status' => 'P',
                    'note' => 'Present and settled.',
                ],
                [
                    'student_id' => $secondStudent->id,
                    'status' => 'L',
                    'note' => 'Arrived after assembly.',
                ],
            ],
        ];

        $reportId = $this->actingAs($teacher)
            ->putJson('/api/teacher/register-reports/current', $payload)
            ->assertOk()
            ->assertJsonPath('report.status', 'draft')
            ->assertJsonPath('report.entries.1.status', 'L')
            ->assertJsonPath('report.summary.counts.L', 1)
            ->json('report.id');

        $this->actingAs($teacher)
            ->getJson('/api/teacher/gradebook')
            ->assertOk()
            ->assertJsonPath('registerReport.id', $reportId)
            ->assertJsonPath('registerReport.status', 'draft')
            ->assertJsonPath('registerReport.entries.0.student_name', 'Agnes Chirwa');

        $this->actingAs($teacher)
            ->putJson("/api/teacher/register-reports/{$reportId}", [
                'school_track' => 'primary',
                'class_name' => 'Standard 4',
                'periods' => $payload['periods'],
                'entries' => [
                    [
                        'student_id' => $firstStudent->id,
                        'status' => 'P',
                        'note' => 'Present and focused.',
                    ],
                    [
                        'student_id' => $secondStudent->id,
                        'status' => 'P',
                        'note' => 'Late issue resolved.',
                    ],
                ],
            ])
            ->assertOk()
            ->assertJsonPath('report.summary.counts.P', 2);

        $this->actingAs($teacher)
            ->postJson("/api/teacher/register-reports/{$reportId}/submit")
            ->assertOk()
            ->assertJsonPath('report.status', 'submitted');

        $this->actingAs($teacher)
            ->putJson("/api/teacher/register-reports/{$reportId}", $payload)
            ->assertStatus(409);

        $this->assertDatabaseHas('register_reports', [
            'id' => $reportId,
            'school_id' => $school->id,
            'teacher_id' => $teacher->id,
            'status' => 'submitted',
        ]);

        $this->assertDatabaseHas('user_notifications', [
            'user_id' => $headTeacher->id,
            'title' => 'New register report submitted',
        ]);
    }

    public function test_teacher_can_only_access_their_own_school_reports(): void
    {
        $schoolA = School::query()->create(['name' => 'Mulanje Academy']);
        $schoolB = School::query()->create(['name' => 'Thyolo Academy']);

        $teacherA = User::factory()->teacher()->create([
            'school_id' => $schoolA->id,
            'school_track' => 'primary',
            'assigned_class_name' => 'Standard 4',
        ]);

        $teacherB = User::factory()->teacher()->create([
            'school_id' => $schoolB->id,
            'school_track' => 'primary',
            'assigned_class_name' => 'Standard 4',
        ]);

        RegisterReport::query()->create([
            'school_id' => $schoolA->id,
            'teacher_id' => $teacherA->id,
            'teacher_name' => $teacherA->name,
            'school_track' => 'primary',
            'class_name' => 'Standard 4',
            'report_date' => now()->toDateString(),
            'status' => 'draft',
            'periods' => [['label' => 'AM']],
            'entries' => [['student_id' => 10, 'student_name' => 'Agnes', 'student_code' => 'S1', 'status' => 'P', 'note' => '']],
            'summary' => ['total_students' => 1, 'counts' => ['P' => 1, 'L' => 0, 'S' => 0, 'A' => 0, 'E' => 0]],
        ]);

        RegisterReport::query()->create([
            'school_id' => $schoolB->id,
            'teacher_id' => $teacherB->id,
            'teacher_name' => $teacherB->name,
            'school_track' => 'primary',
            'class_name' => 'Standard 4',
            'report_date' => now()->toDateString(),
            'status' => 'draft',
            'periods' => [['label' => 'AM']],
            'entries' => [['student_id' => 11, 'student_name' => 'Brian', 'student_code' => 'S2', 'status' => 'P', 'note' => '']],
            'summary' => ['total_students' => 1, 'counts' => ['P' => 1, 'L' => 0, 'S' => 0, 'A' => 0, 'E' => 0]],
        ]);

        $this->actingAs($teacherA)
            ->getJson('/api/teacher/register-reports')
            ->assertOk()
            ->assertJsonCount(1, 'reports')
            ->assertJsonPath('reports.0.teacher_id', $teacherA->id);
    }
}
