<?php

namespace Tests\Feature\Guardian;

use App\Models\GradeAssessmentPeriod;
use App\Models\School;
use App\Models\SchoolMerchandiseItem;
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

        $period = GradeAssessmentPeriod::query()->create([
            'school_id' => $school->id,
            'name' => 'End of Term Results',
            'position' => 1,
        ]);

        StudentPerformanceRecord::query()->create([
            'student_record_id' => $student->id,
            'teacher_id' => $teacher->id,
            'assessment_period_id' => $period->id,
            'grade' => 'English: A; Mathematics: 78%',
            'subject_grades' => [
                [
                    'subject_id' => 11,
                    'subject_name' => 'English',
                    'subject_code' => 'ENG',
                    'grade' => 'A',
                ],
                [
                    'subject_id' => 12,
                    'subject_name' => 'Mathematics',
                    'subject_code' => 'MTH',
                    'grade' => '78%',
                ],
            ],
            'comment' => 'Consistent work across the term.',
            'status' => StudentPerformanceRecord::STATUS_APPROVED,
        ]);

        $guardian = User::factory()->guardian()->create([
            'school_id' => $school->id,
            'linked_student_record_id' => $student->id,
        ]);

        $this->actingAs($guardian)
            ->getJson('/api/guardian/child')
            ->assertOk()
            ->assertJsonPath('child.full_name', 'Brian Chirwa')
            ->assertJsonPath(
                'child.performance_records.0.assessment_period_name',
                'End of Term Results',
            )
            ->assertJsonPath(
                'child.performance_records.0.grade_summary',
                'English: A; Mathematics: 78%',
            )
            ->assertJsonPath(
                'child.performance_records.0.subject_grades.0.subject_name',
                'English',
            )
            ->assertJsonPath(
                'child.performance_records.0.subject_grades.0.grade',
                'A',
            )
            ->assertJsonPath(
                'child.performance_records.0.comment',
                'Consistent work across the term.',
            );
    }

    public function test_guardian_can_view_available_school_merchandise(): void
    {
        $school = School::query()->create([
            'name' => 'Kasungu Academy',
        ]);

        $student = StudentRecord::query()->create([
            'school_id' => $school->id,
            'school_track' => 'primary',
            'class_name' => 'Standard 5',
            'full_name' => 'Martha Kalua',
        ]);

        SchoolMerchandiseItem::query()->create([
            'school_id' => $school->id,
            'name' => 'School Shirt',
            'category' => 'Uniform',
            'price' => 15000,
            'description' => 'White branded school shirt.',
            'is_available' => true,
        ]);

        SchoolMerchandiseItem::query()->create([
            'school_id' => $school->id,
            'name' => 'Archived Item',
            'category' => 'Books',
            'price' => 5000,
            'is_available' => false,
        ]);

        $guardian = User::factory()->guardian()->create([
            'school_id' => $school->id,
            'linked_student_record_id' => $student->id,
        ]);

        $this->actingAs($guardian)
            ->getJson('/api/guardian/merchandise')
            ->assertOk()
            ->assertJsonCount(1, 'items')
            ->assertJsonPath('items.0.name', 'School Shirt')
            ->assertJsonPath('items.0.category', 'Uniform')
            ->assertJsonPath('items.0.price', 15000)
            ->assertJsonPath('items.0.description', 'White branded school shirt.');
    }
}
