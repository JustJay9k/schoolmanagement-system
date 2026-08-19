<?php

namespace Tests\Feature\Management;

use App\Enums\UserRole;
use App\Enums\UserStatus;
use App\Models\RegisterReport;
use App\Models\School;
use App\Models\SchoolSetting;
use App\Models\StudentRecord;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ManagementDashboardTest extends TestCase
{
    use RefreshDatabase;

    public function test_head_teacher_dashboard_summary_is_scoped_to_their_school(): void
    {
        $managedSchool = School::query()->create(['name' => 'Managed School']);
        $otherSchool = School::query()->create(['name' => 'Other School']);
        $headTeacher = User::factory()->management()->create([
            'school_id' => $managedSchool->id,
        ]);

        SchoolSetting::query()->create([
            'school_id' => $managedSchool->id,
            'key' => 'school_structure',
            'value' => [
                'primary' => ['Standard 1', 'Standard 2'],
                'secondary' => ['Form 1', 'Form 2'],
            ],
        ]);

        StudentRecord::query()->create([
            'school_id' => $managedSchool->id,
            'school_track' => 'primary',
            'class_name' => 'Standard 1',
            'full_name' => 'Primary Learner',
        ]);
        StudentRecord::query()->create([
            'school_id' => $managedSchool->id,
            'school_track' => 'secondary',
            'class_name' => 'Form 1',
            'full_name' => 'Secondary Learner',
        ]);
        StudentRecord::query()->create([
            'school_id' => $otherSchool->id,
            'school_track' => 'primary',
            'class_name' => 'Standard 1',
            'full_name' => 'Other Learner',
        ]);

        User::factory()->teacher()->create([
            'school_id' => $managedSchool->id,
            'school_track' => 'primary',
            'assigned_class_name' => 'Standard 1',
            'status' => UserStatus::Active,
        ]);
        User::factory()->teacher()->create([
            'school_id' => $managedSchool->id,
            'school_track' => 'secondary',
            'assigned_class_name' => 'Form 1',
            'status' => UserStatus::Inactive,
        ]);
        User::factory()->teacher()->create([
            'school_id' => $otherSchool->id,
            'school_track' => 'primary',
            'assigned_class_name' => 'Standard 1',
            'status' => UserStatus::Active,
        ]);

        RegisterReport::query()->create([
            'school_id' => $managedSchool->id,
            'teacher_id' => $headTeacher->id,
            'teacher_name' => $headTeacher->name,
            'school_track' => 'primary',
            'class_name' => 'Standard 1',
            'report_date' => today(),
            'status' => 'submitted',
            'periods' => [],
            'entries' => [],
            'summary' => [],
        ]);
        RegisterReport::query()->create([
            'school_id' => $otherSchool->id,
            'teacher_id' => $headTeacher->id,
            'teacher_name' => $headTeacher->name,
            'school_track' => 'primary',
            'class_name' => 'Standard 1',
            'report_date' => today(),
            'status' => 'submitted',
            'periods' => [],
            'entries' => [],
            'summary' => [],
        ]);

        $this->actingAs($headTeacher)
            ->getJson('/api/management/dashboard')
            ->assertOk()
            ->assertJsonPath('school.id', $managedSchool->id)
            ->assertJsonPath('summary.students.total', 2)
            ->assertJsonPath('summary.students.primary', 1)
            ->assertJsonPath('summary.students.secondary', 1)
            ->assertJsonPath('summary.teachers.total', 2)
            ->assertJsonPath('summary.teachers.active', 1)
            ->assertJsonPath('summary.classes.configured', 4)
            ->assertJsonPath('summary.classes.with_assigned_teacher', 2)
            ->assertJsonPath('summary.classes.without_assigned_teacher', 2)
            ->assertJsonPath('summary.registers.submitted_today', 1);
    }

    public function test_head_teacher_without_school_gets_empty_dashboard_summary(): void
    {
        $headTeacher = User::factory()->management()->create([
            'school_id' => null,
        ]);

        $this->actingAs($headTeacher)
            ->getJson('/api/management/dashboard')
            ->assertOk()
            ->assertJsonPath('requiresSchoolAssignment', true)
            ->assertJsonPath('summary.students.total', 0)
            ->assertJsonPath('summary.teachers.total', 0);
    }
}
