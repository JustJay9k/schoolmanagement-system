<?php

namespace Tests\Feature\Guardian;

use App\Models\Homework;
use App\Models\HomeworkQuestion;
use App\Models\HomeworkSubmission;
use App\Models\School;
use App\Models\StudentRecord;
use App\Models\User;
use App\Models\UserNotification;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class GuardianHomeworkSubmissionTest extends TestCase
{
    use RefreshDatabase;

    private School $school;

    private User $teacher;

    private StudentRecord $child;

    private User $guardian;

    protected function setUp(): void
    {
        parent::setUp();

        $this->school = School::query()->create(['name' => 'Test School']);
        $this->teacher = User::factory()->teacher()->create([
            'school_id' => $this->school->id,
            'school_track' => 'primary',
            'assigned_class_name' => 'Standard 3',
        ]);

        $this->child = StudentRecord::query()->create([
            'school_id' => $this->school->id,
            'school_track' => 'primary',
            'class_name' => 'Standard 3',
            'full_name' => 'Class Learner',
        ]);

        $this->guardian = User::factory()->guardian()->create([
            'school_id' => $this->school->id,
            'linked_student_record_id' => $this->child->id,
        ]);
    }

    private function createHomeworkWithQuestions(): Homework
    {
        /** @var Homework $homework */
        $homework = Homework::query()->create([
            'school_id' => $this->school->id,
            'teacher_id' => $this->teacher->id,
            'school_track' => 'primary',
            'class_name' => 'Standard 3',
            'title' => 'Fractions practice',
            'description' => 'Show your working.',
        ]);

        foreach (['Add 1/2 + 1/4', 'Simplify 6/8'] as $position => $questionText) {
            HomeworkQuestion::query()->create([
                'homework_id' => $homework->id,
                'position' => $position,
                'question_text' => $questionText,
            ]);
        }

        return $homework;
    }

    public function test_guardian_can_save_a_draft_and_resume_it_later(): void
    {
        Storage::fake('public');

        $homework = $this->createHomeworkWithQuestions();
        $questionIds = $homework->questions->pluck('id');

        // A partial draft with a document is allowed.
        $draftResponse = $this->actingAs($this->guardian)
            ->post("/api/guardian/homework/{$homework->id}/submission", [
                'answers' => [
                    ['question_id' => $questionIds[0], 'answer' => 'The answer is 3/4.'],
                ],
                'notes' => 'We struggled with question two.',
                'attachments' => [
                    UploadedFile::fake()->image('working.jpg'),
                ],
            ]);

        $draftResponse->assertOk()
            ->assertJsonPath('submission.status', 'draft');

        Storage::disk('public')->assertExists(
            HomeworkSubmission::query()->sole()->attachments->firstOrFail()->file_path,
        );

        // The draft comes back pre-filled from the feed and the dedicated endpoint.
        $this->actingAs($this->guardian)
            ->getJson('/api/guardian/homework')
            ->assertOk()
            ->assertJsonPath('homework.0.my_submission.status', 'draft')
            ->assertJsonPath('homework.0.my_submission.notes', 'We struggled with question two.')
            ->assertJsonCount(1, 'homework.0.my_submission.answers')
            ->assertJsonCount(1, 'homework.0.my_submission.attachments');

        $this->actingAs($this->guardian)
            ->getJson("/api/guardian/homework/{$homework->id}/submission")
            ->assertOk()
            ->assertJsonPath('submission.answers.0.question_id', (int) $questionIds[0]);

        // No teacher notification for drafts.
        $this->assertSame(0, UserNotification::query()->count());
    }

    public function test_submitting_requires_every_question_to_be_answered(): void
    {
        $homework = $this->createHomeworkWithQuestions();
        $questionIds = $homework->questions->pluck('id');

        $this->actingAs($this->guardian)
            ->postJson("/api/guardian/homework/{$homework->id}/submit", [
                'answers' => [
                    ['question_id' => $questionIds[0], 'answer' => 'Only one answered.'],
                ],
            ])
            ->assertUnprocessable();

        $this->assertNull(HomeworkSubmission::query()->first()?->submitted_at);
    }

    public function test_submitting_notifies_the_teacher_and_locks_editing(): void
    {
        Storage::fake('public');

        $homework = $this->createHomeworkWithQuestions();
        [$first, $second] = $homework->questions->pluck('id')->all();

        $submitResponse = $this->actingAs($this->guardian)
            ->post("/api/guardian/homework/{$homework->id}/submit", [
                'answers' => [
                    ['question_id' => $first, 'answer' => '3/4'],
                    ['question_id' => $second, 'answer' => '3/4'],
                ],
                'notes' => 'Completed independently.',
                'attachments' => [
                    UploadedFile::fake()->createWithContent('scan.pdf', '%PDF-1.4 test'),
                ],
            ]);

        $submitResponse->assertOk()
            ->assertJsonPath('submission.status', 'submitted')
            ->assertJsonPath('message', 'Response submitted. Your teacher has been notified.');

        $submission = HomeworkSubmission::query()->sole();
        $this->assertSame(HomeworkSubmission::STATUS_SUBMITTED, $submission->status);
        $this->assertNotNull($submission->submitted_at);
        $this->assertCount(1, $submission->attachments);

        // The teacher received exactly one response notification.
        $notifications = UserNotification::query()
            ->where('user_id', $this->teacher->id)
            ->where('title', 'Homework response received')
            ->get();
        $this->assertCount(1, $notifications);
        $this->assertStringContainsString($this->child->full_name, $notifications->first()->message);

        // The submitted response is visible on the teacher's homework feed.
        $this->actingAs($this->teacher)
            ->getJson('/api/teacher/homework')
            ->assertOk()
            ->assertJsonPath('homework.0.submissions.0.student_name', $this->child->full_name)
            ->assertJsonPath('homework.0.submissions.0.notes', 'Completed independently.')
            ->assertJsonCount(2, 'homework.0.submissions.0.answers');

        // Editing after submission is blocked.
        $this->actingAs($this->guardian)
            ->postJson("/api/guardian/homework/{$homework->id}/submission", [
                'notes' => 'Trying to sneak in changes.',
            ])
            ->assertUnprocessable();

        $this->assertSame(
            'Completed independently.',
            $submission->fresh()->notes,
        );
    }

    public function test_submissions_are_rejected_after_the_deadline(): void
    {
        $homework = Homework::query()->create([
            'school_id' => $this->school->id,
            'teacher_id' => $this->teacher->id,
            'school_track' => 'primary',
            'class_name' => 'Standard 3',
            'title' => 'Past due homework',
            'due_date' => now()->subHour(),
        ]);

        $this->actingAs($this->guardian)
            ->postJson("/api/guardian/homework/{$homework->id}/submit", [
                'notes' => 'Too late.',
            ])
            ->assertUnprocessable()
            ->assertJsonPath('message', 'The deadline for this homework has passed. Submissions are now closed.');

        $this->actingAs($this->guardian)
            ->postJson("/api/guardian/homework/{$homework->id}/submission", [
                'notes' => 'Too late.',
            ])
            ->assertUnprocessable()
            ->assertJsonPath('message', 'The deadline for this homework has passed. Submissions are now closed.');

        $this->assertDatabaseMissing('homework_submissions', [
            'homework_id' => $homework->id,
            'status' => 'draft',
        ]);
    }

    public function test_a_guardian_from_another_class_cannot_touch_the_homework(): void
    {
        $otherChild = StudentRecord::query()->create([
            'school_id' => $this->school->id,
            'school_track' => 'primary',
            'class_name' => 'Standard 4',
            'full_name' => 'Outsider Learner',
        ]);
        $outsiderGuardian = User::factory()->guardian()->create([
            'school_id' => $this->school->id,
            'linked_student_record_id' => $otherChild->id,
        ]);

        $homework = $this->createHomeworkWithQuestions();

        $this->actingAs($outsiderGuardian)
            ->postJson("/api/guardian/homework/{$homework->id}/submit", [
                'answers' => [
                    [
                        'question_id' => $homework->questions->first()->id,
                        'answer' => 'I am not in this class.',
                    ],
                ],
            ])
            ->assertNotFound();

        $this->assertSame(0, HomeworkSubmission::query()->count());

        // Guardians may not act for somebody else's child either.
        $this->actingAs($outsiderGuardian)
            ->getJson("/api/guardian/homework/{$homework->id}/submission")
            ->assertNotFound();
    }
}
