<?php

namespace App\Http\Controllers\Api\Guardian;

use App\Http\Controllers\Controller;
use App\Http\Requests\Guardian\SaveHomeworkSubmissionRequest;
use App\Models\Homework;
use App\Models\HomeworkSubmission;
use App\Models\HomeworkSubmissionAttachment;
use App\Models\StudentRecord;
use App\Support\UserNotificationCenter;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class GuardianHomeworkSubmissionApiController extends Controller
{
    public function show(Request $request, Homework $homework): JsonResponse
    {
        $child = $this->resolveChild($request, $homework);

        /** @var HomeworkSubmission|null $submission */
        $submission = HomeworkSubmission::query()
            ->where('homework_id', $homework->id)
            ->where('student_record_id', $child->id)
            ->with('attachments')
            ->first();

        return response()->json([
            'submission' => $submission ? $this->serializeSubmission($submission) : null,
        ]);
    }

    public function saveDraft(
        SaveHomeworkSubmissionRequest $request,
        Homework $homework,
    ): JsonResponse {
        $this->ensureNotSubmitted($request, $homework);
        $this->ensureNotOverdue($homework);

        return response()->json([
            'message' => 'Draft saved. You can continue any time before submitting.',
            'submission' => $this->persist($request, $homework),
        ]);
    }

    public function submit(
        SaveHomeworkSubmissionRequest $request,
        Homework $homework,
    ): JsonResponse {
        $child = $this->resolveChild($request, $homework);

        $this->ensureNotSubmitted($request, $homework);
        $this->ensureNotOverdue($homework);

        $answers = collect($request->validated('answers', []))
            ->mapWithKeys(fn (array $entry): array => [
                (int) $entry['question_id'] => trim((string) $entry['answer']),
            ]);

        if ($homework->questions()->count() > 0) {
            $missing = $homework->questions
                ->filter(fn ($question) => blank($answers->get((int) $question->id)))
                ->pluck('question_text');

            abort_if(
                $missing->isNotEmpty(),
                422,
                'Answer every question before submitting. Missing: '.$missing->take(3)->implode(', '),
            );
        }

        if ($homework->questions()->count() === 0) {
            // Documents-only homework still needs some content before submitting.
            $existing = HomeworkSubmission::query()
                ->where('homework_id', $homework->id)
                ->where('student_record_id', $child->id)
                ->first();

            abort_unless(
                filled($request->validated('notes'))
                    || filled($request->file('attachments'))
                    || ($existing && ($existing->attachments()->exists() || filled($existing->notes))),
                422,
                'Add at least a note or a document before submitting.',
            );
        }

        $submission = $this->persist($request, $homework, submitted: true);

        UserNotificationCenter::createForUser(
            $homework->teacher,
            'Homework response received',
            sprintf(
                '%s submitted a response for "%s" (%s). Open the Schoolwork page to review it.',
                $child->full_name,
                $homework->title,
                $homework->class_name,
            ),
            'success',
            '/gradebook',
        );

        return response()->json([
            'message' => 'Response submitted. Your teacher has been notified.',
            'submission' => $this->serializeSubmission($submission),
        ]);
    }

    private function ensureNotOverdue(Homework $homework): void
    {
        abort_if(
            filled($homework->due_date) && now()->greaterThan($homework->due_date),
            422,
            'The deadline for this homework has passed. Submissions are now closed.',
        );
    }

    private function ensureNotSubmitted(Request $request, Homework $homework): void
    {
        $guardian = $request->user();

        abort_unless($guardian?->isGuardian(), 403);

        $submitted = HomeworkSubmission::query()
            ->where('homework_id', $homework->id)
            ->where('student_record_id', $guardian->linkedStudentRecord()->first()?->id)
            ->where('status', HomeworkSubmission::STATUS_SUBMITTED)
            ->exists();

        abort_if(
            $submitted,
            422,
            'This homework response was already submitted and can no longer be edited.',
        );
    }

    private function persist(
        SaveHomeworkSubmissionRequest $request,
        Homework $homework,
        bool $submitted = false,
    ): HomeworkSubmission {
        $child = $this->resolveChild($request, $homework);

        $existing = HomeworkSubmission::query()
            ->where('homework_id', $homework->id)
            ->where('student_record_id', $child->id)
            ->with('attachments')
            ->first();

        $answers = collect($request->validated('answers', []))
            ->mapWithKeys(fn (array $entry): array => [
                (int) $entry['question_id'] => trim((string) $entry['answer']),
            ])
            ->all();

        /** @var HomeworkSubmission $submission */
        $submission = HomeworkSubmission::query()->updateOrCreate(
            [
                'homework_id' => $homework->id,
                'student_record_id' => $child->id,
            ],
            [
                'status' => $submitted ? HomeworkSubmission::STATUS_SUBMITTED : HomeworkSubmission::STATUS_DRAFT,
                'answers' => $answers ?: null,
                'notes' => $request->validated('notes') ?? null,
                'submitted_at' => $submitted ? now() : $existing?->submitted_at,
            ],
        );

        foreach ((array) $request->validated('remove_attachment_ids', []) as $attachmentId) {
            /** @var HomeworkSubmissionAttachment|null $attachment */
            $attachment = $submission->attachments->firstWhere('id', (int) $attachmentId);

            if (! $attachment) {
                continue;
            }

            Storage::disk('public')->delete($attachment->file_path);
            $attachment->delete();
        }

        foreach ((array) $request->file('attachments', []) as $uploadedFile) {
            $path = $uploadedFile->store('homework-submission-attachments', 'public');
            $mimeType = (string) $uploadedFile->getClientMimeType();

            $submission->attachments()->create([
                'file_path' => $path,
                'original_name' => $uploadedFile->getClientOriginalName(),
                'mime_type' => $mimeType,
                'size_in_kb' => max(1, (int) ceil($uploadedFile->getSize() / 1024)),
                'is_image' => str_starts_with($mimeType, 'image/'),
            ]);
        }

        return $submission->fresh(['attachments']);
    }

    private function resolveChild(Request $request, Homework $homework): StudentRecord
    {
        $guardian = $request->user();

        abort_unless($guardian?->isGuardian(), 403);

        /** @var StudentRecord|null $child */
        $child = $guardian->linkedStudentRecord()->first();

        abort_unless((bool) $child, 404, 'No learner record is linked to this guardian account.');

        abort_unless(
            (int) $child->school_id === (int) $homework->school_id
                && $child->school_track === $homework->school_track
                && $child->class_name === $homework->class_name,
            404,
            'This homework does not belong to your child.',
        );

        return $child;
    }

    /**
     * @return array<string, mixed>
     */
    private function serializeSubmission(HomeworkSubmission $submission): array
    {
        return [
            'id' => $submission->id,
            'status' => $submission->status,
            'submitted_at' => $submission->submitted_at?->toIso8601String(),
            'notes' => $submission->notes,
            'answers' => collect($submission->answers ?? [])
                ->map(fn ($answer, int|string $questionId): array => [
                    'question_id' => (int) $questionId,
                    'answer' => is_string($answer) ? $answer : '',
                ])
                ->values()
                ->all(),
            'attachments' => $submission->attachments
                ->map(fn (HomeworkSubmissionAttachment $attachment): array => [
                    'id' => $attachment->id,
                    'name' => $attachment->original_name,
                    'url' => $attachment->download_url,
                    'size_in_kb' => (int) $attachment->size_in_kb,
                    'is_image' => (bool) $attachment->is_image,
                ])
                ->values(),
        ];
    }
}
