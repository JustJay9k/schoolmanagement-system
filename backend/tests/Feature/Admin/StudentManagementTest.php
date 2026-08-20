<?php

namespace Tests\Feature\Admin;

use App\Models\School;
use App\Models\StudentRecord;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class StudentManagementTest extends TestCase
{
    use RefreshDatabase;

    public function test_management_user_can_add_a_student_record_manually(): void
    {
        $headTeacher = User::factory()->management()->create();

        $this->actingAs($headTeacher)
            ->postJson('/api/management/students', [
                'school_track' => 'primary',
                'class_name' => 'Standard 1',
                'full_name' => 'Nathaniel Vincent',
                'sex' => 'male',
                'date_of_birth' => '2000-05-16',
                'age' => 26,
                'student_code' => '20212862526',
                'orphan_status' => 'N/A',
                'disability_name' => 'N/A',
                'guardian_name' => 'Mr Nawanga',
                'guardian_phone' => '+265999000111',
                'guardian_email' => 'nawanga@example.com',
                'residence' => 'Machinjiri area 6',
                'first_entry_date' => '2025-10-20',
            ])
            ->assertCreated()
            ->assertJsonFragment([
                'full_name' => 'Nathaniel Vincent',
                'class_name' => 'Standard 1',
                'student_code' => '20212862526',
                'guardian_phone' => '+265999000111',
                'guardian_email' => 'nawanga@example.com',
            ]);

        $this->assertDatabaseHas('student_records', [
            'full_name' => 'Nathaniel Vincent',
            'school_track' => 'primary',
            'class_name' => 'Standard 1',
            'guardian_phone' => '+265999000111',
            'guardian_email' => 'nawanga@example.com',
        ]);
    }

    public function test_management_user_can_import_student_records(): void
    {
        $headTeacher = User::factory()->management()->create();

        $this->actingAs($headTeacher)
            ->postJson('/api/management/students/import', [
                'school_track' => 'secondary',
                'class_name' => 'Form 1',
                'records' => [
                    [
                        'full_name' => 'Martha Kalua',
                        'sex' => 'female',
                        'date_of_birth' => '2011-05-17',
                        'age' => 14,
                        'student_code' => 'F1-001',
                        'orphan_status' => 'N/A',
                        'disability_name' => 'N/A',
                        'guardian_name' => 'Mrs Kalua',
                        'guardian_phone' => '+265999000222',
                        'guardian_email' => 'kalua@example.com',
                        'residence' => 'Ndirande',
                        'first_entry_date' => '2025-01-10',
                    ],
                    [
                        'full_name' => 'Brian Chirwa',
                        'sex' => 'male',
                        'date_of_birth' => '2011-08-02',
                        'age' => 14,
                        'student_code' => 'F1-002',
                        'orphan_status' => 'Single parent',
                        'disability_name' => 'N/A',
                        'guardian_name' => 'Mr Chirwa',
                        'guardian_phone' => '+265999000333',
                        'guardian_email' => 'chirwa@example.com',
                        'residence' => 'Limbe',
                        'first_entry_date' => '2025-01-10',
                    ],
                ],
            ])
            ->assertOk()
            ->assertJsonPath('summary.created', 2)
            ->assertJsonPath('summary.updated', 0);

        $this->assertDatabaseCount('student_records', 2);

        $this->actingAs($headTeacher)
            ->postJson('/api/management/students/import', [
                'school_track' => 'secondary',
                'class_name' => 'Form 1',
                'records' => [
                    [
                        'full_name' => 'Martha Kalua',
                        'sex' => 'female',
                        'date_of_birth' => '2011-05-17',
                        'age' => 15,
                        'student_code' => 'F1-001',
                        'orphan_status' => 'N/A',
                        'disability_name' => 'Visual support',
                        'guardian_name' => 'Mrs Kalua',
                        'guardian_phone' => '+265999000444',
                        'guardian_email' => 'updated-kalua@example.com',
                        'residence' => 'Ndirande',
                        'first_entry_date' => '2025-01-10',
                    ],
                ],
            ])
            ->assertOk()
            ->assertJsonPath('summary.created', 0)
            ->assertJsonPath('summary.updated', 1);

        $this->assertDatabaseHas('student_records', [
            'student_code' => 'F1-001',
            'disability_name' => 'Visual support',
            'guardian_phone' => '+265999000444',
            'guardian_email' => 'updated-kalua@example.com',
        ]);
    }

    public function test_management_user_can_update_a_student_record_for_their_school(): void
    {
        $school = School::query()->create(['name' => 'Managed School']);
        $headTeacher = User::factory()->management()->create([
            'school_id' => $school->id,
        ]);
        $student = StudentRecord::query()->create([
            'school_id' => $school->id,
            'school_track' => 'primary',
            'class_name' => 'Standard 1',
            'full_name' => 'Old Name',
            'student_code' => 'ST-001',
            'guardian_name' => 'Old Guardian',
            'created_by' => $headTeacher->id,
        ]);

        $this->actingAs($headTeacher)
            ->putJson("/api/management/students/{$student->id}", [
                'school_track' => 'secondary',
                'class_name' => 'Form 1',
                'full_name' => 'Updated Learner',
                'sex' => 'female',
                'date_of_birth' => '2012-03-12',
                'age' => 14,
                'student_code' => 'ST-001',
                'orphan_status' => 'No',
                'disability_name' => '',
                'guardian_name' => 'Updated Guardian',
                'guardian_phone' => '+265999000555',
                'guardian_email' => 'updated.guardian@example.com',
                'residence' => 'Zingwangwa',
                'first_entry_date' => '2026-01-08',
            ])
            ->assertOk()
            ->assertJsonPath('student.full_name', 'Updated Learner')
            ->assertJsonPath('student.class_name', 'Form 1')
            ->assertJsonPath('student.guardian_phone', '+265999000555');

        $this->assertDatabaseHas('student_records', [
            'id' => $student->id,
            'school_id' => $school->id,
            'full_name' => 'Updated Learner',
            'school_track' => 'secondary',
            'class_name' => 'Form 1',
            'guardian_email' => 'updated.guardian@example.com',
        ]);
    }

    public function test_management_user_can_delete_a_student_record_for_their_school(): void
    {
        $school = School::query()->create(['name' => 'Managed School']);
        $headTeacher = User::factory()->management()->create([
            'school_id' => $school->id,
        ]);
        $student = StudentRecord::query()->create([
            'school_id' => $school->id,
            'school_track' => 'primary',
            'class_name' => 'Standard 1',
            'full_name' => 'Learner To Delete',
            'student_code' => 'ST-DELETE',
            'created_by' => $headTeacher->id,
        ]);

        $this->actingAs($headTeacher)
            ->deleteJson("/api/management/students/{$student->id}")
            ->assertOk()
            ->assertJsonPath('message', 'Student record deleted successfully.');

        $this->assertSoftDeleted('student_records', [
            'id' => $student->id,
        ]);

        $this->actingAs($headTeacher)
            ->getJson('/api/management/students')
            ->assertOk()
            ->assertJsonMissing([
                'id' => $student->id,
            ]);
    }

    public function test_management_user_cannot_update_or_delete_student_records_from_another_school(): void
    {
        $managedSchool = School::query()->create(['name' => 'Managed School']);
        $otherSchool = School::query()->create(['name' => 'Other School']);
        $headTeacher = User::factory()->management()->create([
            'school_id' => $managedSchool->id,
        ]);
        $student = StudentRecord::query()->create([
            'school_id' => $otherSchool->id,
            'school_track' => 'primary',
            'class_name' => 'Standard 1',
            'full_name' => 'Other School Learner',
            'student_code' => 'OTHER-ST-001',
        ]);

        $this->actingAs($headTeacher)
            ->putJson("/api/management/students/{$student->id}", [
                'school_track' => 'primary',
                'class_name' => 'Standard 2',
                'full_name' => 'Changed Name',
                'student_code' => 'OTHER-ST-001',
            ])
            ->assertForbidden();

        $this->actingAs($headTeacher)
            ->deleteJson("/api/management/students/{$student->id}")
            ->assertForbidden();

        $this->assertDatabaseHas('student_records', [
            'id' => $student->id,
            'school_id' => $otherSchool->id,
            'full_name' => 'Other School Learner',
        ]);
    }

    public function test_admin_can_view_restore_and_permanently_delete_archived_student_records(): void
    {
        $school = School::query()->create(['name' => 'Managed School']);
        $admin = User::factory()->admin()->create();
        $student = StudentRecord::query()->create([
            'school_id' => $school->id,
            'school_track' => 'primary',
            'class_name' => 'Standard 1',
            'full_name' => 'Archived Learner',
            'student_code' => 'ARCH-001',
            'guardian_name' => 'Archived Guardian',
        ]);

        $student->delete();

        $this->actingAs($admin)
            ->getJson('/api/admin/deleted-records/students')
            ->assertOk()
            ->assertJsonPath('stats.total', 1)
            ->assertJsonFragment([
                'full_name' => 'Archived Learner',
                'school_name' => 'Managed School',
                'student_code' => 'ARCH-001',
            ]);

        $this->actingAs($admin)
            ->patchJson("/api/admin/deleted-records/students/{$student->id}/restore")
            ->assertOk()
            ->assertJsonPath('message', 'Student record restored successfully.');

        $this->assertDatabaseHas('student_records', [
            'id' => $student->id,
            'deleted_at' => null,
        ]);

        $student->delete();

        $this->actingAs($admin)
            ->deleteJson("/api/admin/deleted-records/students/{$student->id}")
            ->assertOk()
            ->assertJsonPath('message', 'Student record permanently deleted successfully.');

        $this->assertDatabaseMissing('student_records', [
            'id' => $student->id,
        ]);
    }

    public function test_admin_cannot_access_management_student_endpoints(): void
    {
        $admin = User::factory()->admin()->create();

        $this->actingAs($admin)
            ->getJson('/api/management/students')
            ->assertForbidden();
    }

    public function test_student_record_requires_class_to_match_track(): void
    {
        $headTeacher = User::factory()->management()->create();

        $this->actingAs($headTeacher)
            ->postJson('/api/management/students', [
                'school_track' => 'primary',
                'class_name' => 'Form 1',
                'full_name' => 'Invalid Assignment',
            ])
            ->assertStatus(422)
            ->assertJsonValidationErrors('class_name');
    }
}
