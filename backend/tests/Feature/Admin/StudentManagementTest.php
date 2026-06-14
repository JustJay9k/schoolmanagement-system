<?php

namespace Tests\Feature\Admin;

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
                'residence' => 'Machinjiri area 6',
                'first_entry_date' => '2025-10-20',
            ])
            ->assertCreated()
            ->assertJsonFragment([
                'full_name' => 'Nathaniel Vincent',
                'class_name' => 'Standard 1',
                'student_code' => '20212862526',
            ]);

        $this->assertDatabaseHas('student_records', [
            'full_name' => 'Nathaniel Vincent',
            'school_track' => 'primary',
            'class_name' => 'Standard 1',
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
