<?php

namespace Tests\Feature\Teacher;

use App\Models\GradeAssessmentPeriod;
use App\Models\School;
use App\Models\SchoolSubject;
use App\Models\StudentPerformanceRecord;
use App\Models\StudentRecord;
use App\Models\User;
use App\Support\SchoolContextOptions;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ClassPromotionWorkflowTest extends TestCase
{
    use RefreshDatabase;

    private School $school;

    private User $teacher;

    private User $headTeacher;

    private StudentRecord $alice;

    private StudentRecord $bob;

    private StudentRecord $carol;

    private GradeAssessmentPeriod $midTerm;

    private GradeAssessmentPeriod $endTerm;

    private int $mathsId;

    private int $englishId;

    protected function setUp(): void
    {
        parent::setUp();

        $this->school = School::query()->create(['name' => 'Vumbwi Secondary']);

        $this->teacher = User::factory()->teacher()->create([
            'school_id' => $this->school->id,
            'school_track' => 'primary',
            'assigned_class_name' => 'Standard 4',
        ]);

        $this->headTeacher = User::factory()->management()->create([
            'school_id' => $this->school->id,
        ]);

        $this->alice = StudentRecord::query()->create([
            'school_id' => $this->school->id,
            'school_track' => 'primary',
            'class_name' => 'Standard 4',
            'full_name' => 'Alice Banda',
        ]);
        $this->bob = StudentRecord::query()->create([
            'school_id' => $this->school->id,
            'school_track' => 'primary',
            'class_name' => 'Standard 4',
            'full_name' => 'Bob Chuma',
        ]);
        $this->carol = StudentRecord::query()->create([
            'school_id' => $this->school->id,
            'school_track' => 'primary',
            'class_name' => 'Standard 5',
            'full_name' => 'Carol Daka',
        ]);

        $this->midTerm = GradeAssessmentPeriod::query()->create([
            'school_id' => $this->school->id,
            'name' => 'Mid Term',
            'position' => 1,
        ]);
        $this->endTerm = GradeAssessmentPeriod::query()->create([
            'school_id' => $this->school->id,
            'name' => 'End Term',
            'position' => 2,
        ]);

        $maths = SchoolSubject::query()->create([
            'school_id' => $this->school->id,
            'school_track' => 'primary',
            'name' => 'Mathematics',
            'code' => 'MTH',
        ]);
        $english = SchoolSubject::query()->create([
            'school_id' => $this->school->id,
            'school_track' => 'primary',
            'name' => 'English',
            'code' => 'ENG',
        ]);
        $this->mathsId = $maths->id;
        $this->englishId = $english->id;
    }

    private function saveApprovedGrade(StudentRecord $student, string $term, int $periodId, string $mathsGrade, string $englishGrade): void
    {
        $record = StudentPerformanceRecord::query()->create([
            'student_record_id' => $student->id,
            'teacher_id' => $this->teacher->id,
            'assessment_period_id' => $periodId,
            'term' => $term,
            'grade' => 'Learner grades',
            'subject_grades' => [
                ['subject_id' => $this->mathsId, 'subject_name' => 'Mathematics', 'grade' => $mathsGrade, 'remarks' => ''],
                ['subject_id' => $this->englishId, 'subject_name' => 'English', 'grade' => $englishGrade, 'remarks' => ''],
            ],
            'status' => StudentPerformanceRecord::STATUS_APPROVED,
        ]);

        $this->assertSame($record->student_record_id, $student->id);
    }

    public function test_teacher_cannot_promote_outside_the_third_term(): void
    {
        SchoolContextOptions::saveActiveTerm('first', $this->school->id);

        $this->actingAs($this->teacher)
            ->postJson('/api/teacher/class-promotions', [
                'school_track' => 'primary',
                'class_name' => 'Standard 4',
                'student_ids' => [$this->alice->id],
            ])
            ->assertStatus(422)
            ->assertJsonPath('message', 'Promotions open at the end of the term. The school must activate the Third Term before a class can be promoted.');
    }

    public function test_teacher_can_submit_a_promotion_list_with_term_averages(): void
    {
        SchoolContextOptions::saveActiveTerm('third', $this->school->id);

        $this->saveApprovedGrade($this->alice, 'first', $this->midTerm->id, '80%', '80');
        $this->saveApprovedGrade($this->alice, 'second', $this->endTerm->id, '90%', '90');
        $this->saveApprovedGrade($this->alice, 'third', $this->midTerm->id, '70%', '70');

        $response = $this->actingAs($this->teacher)
            ->postJson('/api/teacher/class-promotions', [
                'school_track' => 'primary',
                'class_name' => 'Standard 4',
                'student_ids' => [$this->alice->id, 9999, $this->bob->id],
            ])
            ->assertStatus(201)
            ->assertJsonPath('promotion.from_class', 'Standard 4')
            ->assertJsonPath('promotion.to_class', 'Standard 5')
            ->assertJsonPath('promotion.status', 'pending');

        $studentEntry = collect($response->json('promotion.students'))
            ->firstWhere('student_id', $this->alice->id);

        $this->assertSame('Alice Banda', $studentEntry['full_name']);
        $this->assertSame(80, $studentEntry['average']);

        $this->assertDatabaseHas('class_promotions', [
            'school_id' => $this->school->id,
            'from_class' => 'Standard 4',
            'to_class' => 'Standard 5',
            'status' => 'pending',
        ]);
    }

    public function test_a_class_cannot_have_two_pending_promotions(): void
    {
        SchoolContextOptions::saveActiveTerm('third', $this->school->id);
        $this->saveApprovedGrade($this->alice, 'first', $this->midTerm->id, '80', '80');

        $this->actingAs($this->teacher)
            ->postJson('/api/teacher/class-promotions', [
                'student_ids' => [$this->alice->id],
            ])
            ->assertStatus(201);

        $this->actingAs($this->teacher)
            ->postJson('/api/teacher/class-promotions', [
                'student_ids' => [$this->bob->id],
            ])
            ->assertStatus(409)
            ->assertJsonPath('message', 'A promotion request for this class is already awaiting the head teacher. Cancel or reject the existing request first.');
    }

    public function test_teacher_cannot_submit_from_last_class_in_track(): void
    {
        SchoolContextOptions::saveActiveTerm('third', $this->school->id);

        $unassigned = User::factory()->teacher()->create([
            'school_id' => $this->school->id,
        ]);

        $student = StudentRecord::query()->create([
            'school_id' => $this->school->id,
            'school_track' => 'primary',
            'class_name' => 'Standard 8',
            'full_name' => 'Zake Hara',
        ]);

        $this->actingAs($unassigned)
            ->postJson('/api/teacher/class-promotions', [
                'school_track' => 'primary',
                'class_name' => 'Standard 8',
                'student_ids' => [$student->id],
            ])
            ->assertStatus(422)
            ->assertJsonPath('message', 'Standard 8 is the highest class in this track. There is no next class to promote to.');
    }

    public function test_approve_promotion_moves_only_the_selected_learners(): void
    {
        SchoolContextOptions::saveActiveTerm('third', $this->school->id);
        $this->saveApprovedGrade($this->alice, 'first', $this->midTerm->id, '80', '80');
        $this->saveApprovedGrade($this->bob, 'first', $this->midTerm->id, '70', '70');

        $this->actingAs($this->teacher)
            ->postJson('/api/teacher/class-promotions', [
                'student_ids' => [$this->alice->id, $this->bob->id],
            ])
            ->assertStatus(201);

        $this->actingAs($this->headTeacher)
            ->postJson('/api/management/promotions/1/approve', [
                'student_ids' => [$this->alice->id],
            ])
            ->assertStatus(200)
            ->assertJsonPath('promotion.status', 'approved');

        $this->assertDatabaseHas('student_records', [
            'id' => $this->alice->id,
            'class_name' => 'Standard 5',
        ]);
        $this->assertDatabaseHas('student_records', [
            'id' => $this->bob->id,
            'class_name' => 'Standard 4',
        ]);
    }

    public function test_head_teacher_can_reject_the_request_without_moving_learners(): void
    {
        SchoolContextOptions::saveActiveTerm('third', $this->school->id);
        $this->saveApprovedGrade($this->alice, 'first', $this->midTerm->id, '80', '80');

        $this->actingAs($this->teacher)
            ->postJson('/api/teacher/class-promotions', [
                'student_ids' => [$this->alice->id],
            ])
            ->assertStatus(201);

        $this->actingAs($this->headTeacher)
            ->postJson('/api/management/promotions/1/reject')
            ->assertStatus(200)
            ->assertJsonPath('promotion.status', 'rejected');

        $this->assertDatabaseHas('student_records', [
            'id' => $this->alice->id,
            'class_name' => 'Standard 4',
        ]);
    }

    public function test_management_can_view_pending_and_past_promotions(): void
    {
        SchoolContextOptions::saveActiveTerm('third', $this->school->id);
        $this->saveApprovedGrade($this->alice, 'first', $this->midTerm->id, '80', '80');

        $this->actingAs($this->teacher)
            ->postJson('/api/teacher/class-promotions', [
                'student_ids' => [$this->alice->id],
            ])
            ->assertStatus(201);

        $this->actingAs($this->headTeacher)
            ->getJson('/api/management/promotions')
            ->assertOk()
            ->assertJsonCount(1, 'promotions')
            ->assertJsonPath('promotions.0.status', 'pending')
            ->assertJsonPath('promotions.0.to_class', 'Standard 5');
    }

    public function test_management_approval_requires_membership_of_same_school(): void
    {
        $otherSchool = School::query()->create(['name' => 'Other School']);
        $otherHead = User::factory()->management()->create([
            'school_id' => $otherSchool->id,
        ]);

        SchoolContextOptions::saveActiveTerm('third', $this->school->id);
        $this->saveApprovedGrade($this->alice, 'first', $this->midTerm->id, '80', '80');

        $this->actingAs($this->teacher)
            ->postJson('/api/teacher/class-promotions', [
                'student_ids' => [$this->alice->id],
            ])
            ->assertStatus(201);

        $this->actingAs($otherHead)
            ->postJson('/api/management/promotions/1/approve', [
                'student_ids' => [$this->alice->id],
            ])
            ->assertNotFound();
    }
}