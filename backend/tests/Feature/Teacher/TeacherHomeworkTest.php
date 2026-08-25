<?php

namespace Tests\Feature\Teacher;

use App\Models\Homework;
use App\Models\HomeworkAttachment;
use App\Models\School;
use App\Models\StudentRecord;
use App\Models\User;
use App\Models\UserNotification;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class TeacherHomeworkTest extends TestCase
{
    use RefreshDatabase;

    private School $school;

    private User $teacher;

    protected function setUp(): void
    {
        parent::setUp();

        $this->school = School::query()->create(['name' => 'Test School']);
        $this->teacher = User::factory()->teacher()->create([
            'school_id' => $this->school->id,
            'school_track' => 'primary',
            'assigned_class_name' => 'Standard 3',
        ]);
    }

    public function test_teacher_publishes_homework_and_class_guardians_are_notified(): void
    {
        Storage::fake('public');

        $child = StudentRecord::query()->create([
            'school_id' => $this->school->id,
            'school_track' => 'primary',
            'class_name' => 'Standard 3',
            'full_name' => 'Class Learner',
        ]);
        $guardian = User::factory()->guardian()->create([
            'school_id' => $this->school->id,
            'linked_student_record_id' => $child->id,
        ]);

        $otherChild = StudentRecord::query()->create([
            'school_id' => $this->school->id,
            'school_track' => 'primary',
            'class_name' => 'Standard 4',
            'full_name' => 'Other Class Learner',
        ]);
        User::factory()->guardian()->create([
            'school_id' => $this->school->id,
            'linked_student_record_id' => $otherChild->id,
        ]);

        $dueDate = now()->addWeek()->setTime(14, 30);

        $response = $this->actingAs($this->teacher)
            ->post('/api/teacher/homework', [
                'title' => 'Fractions practice',
                'description' => 'Complete the worksheet before Monday.',
                'due_date' => $dueDate->format('Y-m-d\TH:i'),
                'questions' => ['Add 1/2 + 1/4', 'Simplify 6/8'],
                'attachments' => [
                    UploadedFile::fake()->createWithContent('worksheet.pdf', '%PDF-1.4 test'),
                    UploadedFile::fake()->createWithContent('example.jpg', 'jpeg-bytes'),
                ],
            ]);

        $response->assertCreated()
            ->assertJsonPath('homework.title', 'Fractions practice')
            ->assertJsonCount(2, 'homework.questions')
            ->assertJsonCount(2, 'homework.attachments');

        // The due date keeps its time component end to end.
        $serializedDueDate = $response->json('homework.due_date');
        $this->assertStringContainsString($dueDate->format('H:i'), $serializedDueDate);

        $homework = Homework::query()->sole();
        $this->assertSame('Standard 3', $homework->class_name);
        $this->assertSame($this->teacher->id, $homework->teacher_id);

        Storage::disk('public')->assertExists(
            HomeworkAttachment::query()->firstOrFail()->file_path,
        );

        // Only the guardians of Standard 3 learners were notified.
        $notifiedUserIds = UserNotification::query()
            ->where('action_url', '/guardian/homework')
            ->pluck('user_id')
            ->unique();

        $this->assertSame([$guardian->id], $notifiedUserIds->all());

        // The returned attachment URL is a signed link built from the request host.
        $attachmentUrl = $response->json('homework.attachments.1.url');
        $this->assertStringContainsString('signature=', $attachmentUrl);
        $this->get($attachmentUrl)->assertOk();
        $this->get('/api/homework/attachments/2/file')->assertForbidden();
    }

    public function test_homework_requires_instructions_questions_or_documents(): void
    {
        $this->actingAs($this->teacher)
            ->postJson('/api/teacher/homework', [
                'title' => 'Empty homework',
            ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['questions']);

        $this->assertSame(0, Homework::query()->count());
    }

    public function test_teacher_can_grade_learners_and_guardians_see_the_result(): void
    {
        Storage::fake('public');

        $childA = StudentRecord::query()->create([
            'school_id' => $this->school->id,
            'school_track' => 'primary',
            'class_name' => 'Standard 3',
            'full_name' => 'Learner A',
        ]);
        $guardianA = User::factory()->guardian()->create([
            'school_id' => $this->school->id,
            'linked_student_record_id' => $childA->id,
        ]);

        $childB = StudentRecord::query()->create([
            'school_id' => $this->school->id,
            'school_track' => 'primary',
            'class_name' => 'Standard 4',
            'full_name' => 'Outsider Learner',
        ]);

        $this->actingAs($this->teacher)
            ->post('/api/teacher/homework', [
                'title' => 'Reading task',
                'questions' => ['Summarise chapter one.'],
            ])->assertCreated();

        $homework = Homework::query()->sole();

        // Grading a learner from another class is rejected.
        $this->actingAs($this->teacher)
            ->putJson("/api/teacher/homework/{$homework->id}/grades", [
                'grades' => [
                    ['student_id' => $childB->id, 'grade' => 'A'],
                ],
            ])->assertUnprocessable();

        $this->actingAs($this->teacher)
            ->putJson("/api/teacher/homework/{$homework->id}/grades", [
                'grades' => [
                    ['student_id' => $childA->id, 'grade' => '9/10', 'remarks' => 'Great effort.'],
                ],
            ])->assertOk()
            ->assertJsonPath('message', 'Homework grades saved successfully.');

        $this->assertDatabaseHas('homework_grades', [
            'homework_id' => $homework->id,
            'student_record_id' => $childA->id,
            'grade' => '9/10',
        ]);

        // The graded guardian received a notification.
        $gradedNotifications = UserNotification::query()
            ->where('user_id', $guardianA->id)
            ->where('title', 'Homework graded')
            ->get();
        $this->assertCount(1, $gradedNotifications);
        $this->assertStringContainsString('9/10', $gradedNotifications->first()->message);

        // The guardian sees the homework of the class plus the child's grade.
        $this->actingAs($guardianA)
            ->getJson('/api/guardian/homework')
            ->assertOk()
            ->assertJsonPath('child.id', $childA->id)
            ->assertJsonPath('homework.0.title', 'Reading task')
            ->assertJsonPath('homework.0.my_grade.grade', '9/10')
            ->assertJsonPath('homework.0.my_grade.remarks', 'Great effort.')
            ->assertJsonPath('homework.0.questions.0.question_text', 'Summarise chapter one.');
    }

    public function test_regrading_the_same_work_does_not_duplicate_notifications(): void
    {
        $child = StudentRecord::query()->create([
            'school_id' => $this->school->id,
            'school_track' => 'primary',
            'class_name' => 'Standard 3',
            'full_name' => 'Learner A',
        ]);
        User::factory()->guardian()->create([
            'school_id' => $this->school->id,
            'linked_student_record_id' => $child->id,
        ]);

        $this->actingAs($this->teacher)
            ->post('/api/teacher/homework', [
                'title' => 'Reading task',
                'questions' => ['Question one?'],
            ])->assertCreated();

        $homework = Homework::query()->sole();
        $endpoint = "/api/teacher/homework/{$homework->id}/grades";

        $this->actingAs($this->teacher)
            ->putJson($endpoint, [
                'grades' => [['student_id' => $child->id, 'grade' => '7/10']],
            ])->assertOk();

        // Saving identical values again must not re-notify.
        $this->actingAs($this->teacher)
            ->putJson($endpoint, [
                'grades' => [['student_id' => $child->id, 'grade' => '7/10']],
            ])->assertOk();

        $this->assertSame(1, UserNotification::query()->where('title', 'Homework graded')->count());
    }

    public function test_teacher_cannot_delete_another_teachers_homework(): void
    {
        $otherTeacher = User::factory()->teacher()->create([
            'school_id' => $this->school->id,
            'school_track' => 'primary',
            'assigned_class_name' => 'Standard 5',
        ]);
        $homework = Homework::query()->create([
            'school_id' => $this->school->id,
            'teacher_id' => $otherTeacher->id,
            'school_track' => 'primary',
            'class_name' => 'Standard 5',
            'title' => 'Not mine',
        ]);

        $this->actingAs($this->teacher)
            ->deleteJson("/api/teacher/homework/{$homework->id}")
            ->assertNotFound();

        $this->assertModelExists($homework);
    }

    public function test_index_requires_a_class_assignment(): void
    {
        $unassigned = User::factory()->teacher()->create([
            'school_id' => $this->school->id,
            'school_track' => null,
            'assigned_class_name' => null,
        ]);

        $this->actingAs($unassigned)
            ->getJson('/api/teacher/homework')
            ->assertOk()
            ->assertJsonPath('requiresClassAssignment', true);
    }
}
