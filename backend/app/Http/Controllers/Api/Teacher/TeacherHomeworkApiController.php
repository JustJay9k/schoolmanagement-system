<?php

namespace App\Http\Controllers\Api\Teacher;

use App\Http\Controllers\Controller;
use App\Http\Requests\Teacher\SaveHomeworkGradesRequest;
use App\Http\Requests\Teacher\StoreHomeworkRequest;
use App\Models\Homework;
use App\Models\HomeworkAttachment;
use App\Models\HomeworkGrade;
use App\Models\HomeworkQuestion;
use App\Models\HomeworkSubmission;
use App\Models\HomeworkSubmissionAttachment;
use App\Models\StudentRecord;
use App\Support\UserNotificationCenter;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Storage;

class TeacherHomeworkApiController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $actor = $request->user();

        abort_unless($actor && ($actor->isTeacher() || $actor->canManageTimetables()), 403);

        if (! filled($actor->school_track) || ! filled($actor->assigned_class_name)) {
            return response()->json([
                'homework' => [],
                'roster' => [],
                'requiresClassAssignment' => true,
            ]);
        }

        $homework = Homework::query()
            ->where('school_id', $actor->school_id)
            ->where('teacher_id', $actor->id)
            ->with(['questions', 'attachments', 'grades', 'submissions.studentRecord:id,full_name', 'submissions.attachments'])
            ->latest()
            ->get();

        $roster = $this->classStudents($actor->school_id, $actor->school_track, $actor->assigned_class_name);

        return response()->json([
            'homework' => $homework
                ->map(fn (Homework $item): array => $this->serializeHomework($item))
                ->values(),
            'roster' => $roster
                ->map(fn (StudentRecord $student): array => [
                    'id' => $student->id,
                    'full_name' => $student->full_name,
                    'student_code' => $student->student_code,
                ])
                ->values(),
            'scope' => [
                'school_track' => $actor->school_track,
                'class_name' => $actor->assigned_class_name,
            ],
        ]);
    }

    public function store(StoreHomeworkRequest $request): JsonResponse
    {
        $actor = $request->user();

        abort_unless(
            filled($actor?->school_id) && filled($actor->school_track) && filled($actor->assigned_class_name),
            422,
            'Your account is not assigned to a class yet.',
        );

        $validated = $request->validated();

        /** @var Homework $homework */
        $homework = Homework::query()->create([
            'school_id' => $actor->school_id,
            'teacher_id' => $actor->id,
            'school_track' => $actor->school_track,
            'class_name' => $actor->assigned_class_name,
            'title' => $validated['title'],
            'description' => $validated['description'] ?? null,
            'due_date' => $validated['due_date'] ?? null,
        ]);

        foreach (array_values($validated['questions'] ?? []) as $position => $questionText) {
            $trimmed = trim((string) $questionText);

            if ($trimmed === '') {
                continue;
            }

            $homework->questions()->create([
                'position' => $position,
                'question_text' => $trimmed,
            ]);
        }

        foreach ($request->file('attachments', []) as $uploadedFile) {
            $path = $uploadedFile->store('homework-attachments', 'public');
            $mimeType = (string) $uploadedFile->getClientMimeType();

            $homework->attachments()->create([
                'file_path' => $path,
                'original_name' => $uploadedFile->getClientOriginalName(),
                'mime_type' => $mimeType,
                'size_in_kb' => max(1, (int) ceil($uploadedFile->getSize() / 1024)),
                'is_image' => str_starts_with($mimeType, 'image/'),
            ]);
        }

        $message = sprintf(
            '%s posted new homework "%s" for %s.%s Open your Schoolwork page to review the details.',
            $actor->name,
            $homework->title,
            $homework->class_name,
            $homework->due_date
                ? " It is due on {$homework->due_date->format('D, M j, Y \\a\\t g:i A')}."
                : '',
        );

        $this->guardianGroupsByStudent($homework)
            ->each(fn (Collection $guardians) => $guardians->each(
                fn ($guardian) => UserNotificationCenter::createForUser(
                    $guardian,
                    'New homework posted',
                    $message,
                    'info',
                    '/guardian/homework',
                ),
            ));

        return response()->json([
            'message' => 'Homework published to the guardians of your class.',
            'homework' => $this->serializeHomework($homework->fresh(['questions', 'attachments', 'grades'])),
        ], 201);
    }

    public function updateGrades(
        SaveHomeworkGradesRequest $request,
        Homework $homework,
    ): JsonResponse {
        $actor = $request->user();
        abort_unless($actor, 401);
        abort_unless((int) $homework->teacher_id === (int) $actor->id, 404);

        $entries = collect($request->validated('grades'));

        $students = StudentRecord::query()
            ->whereKey($entries->pluck('student_id')->unique()->all())
            ->get()
            ->keyBy('id');

        foreach ($entries as $entry) {
            $student = $students->get((int) $entry['student_id']);

            if (
                ! $student
                || $student->school_id !== $homework->school_id
                || $student->school_track !== $homework->school_track
                || $student->class_name !== $homework->class_name
            ) {
                abort(422, 'One or more learners do not belong to this homework class.');
            }
        }

        $changedRecords = collect();

        foreach ($entries as $entry) {
            $existing = HomeworkGrade::query()
                ->where('homework_id', $homework->id)
                ->where('student_record_id', (int) $entry['student_id'])
                ->first();

            $gradeChanged = ! $existing
                || $existing->grade !== $entry['grade']
                || ($existing->remarks ?? null) !== ($entry['remarks'] ?? null);

            $record = HomeworkGrade::query()->updateOrCreate(
                [
                    'homework_id' => $homework->id,
                    'student_record_id' => (int) $entry['student_id'],
                ],
                [
                    'teacher_id' => $actor->id,
                    'grade' => $entry['grade'],
                    'remarks' => $entry['remarks'] ?? null,
                ],
            );

            if ($gradeChanged) {
                $changedRecords->push([
                    'record' => $record,
                    'student_name' => $students->get((int) $record->student_record_id)?->full_name ?? 'your child',
                ]);
            }
        }

        foreach ($changedRecords as $changed) {
            /** @var HomeworkGrade $record */
            $record = $changed['record'];

            $this->studentGuardians((int) $record->student_record_id)
                ->each(
                    fn ($guardian) => UserNotificationCenter::createForUser(
                        $guardian,
                        'Homework graded',
                        sprintf(
                            '"%s" for %s: %s%s Open your Schoolwork page for the full result.',
                            $homework->title,
                            $changed['student_name'],
                            $record->grade,
                            filled($record->remarks) ? " Teacher's remarks were included." : '',
                        ),
                        'success',
                        '/guardian/homework',
                    ),
                );
        }

        return response()->json([
            'message' => 'Homework grades saved successfully.',
            'homework' => $this->serializeHomework($homework->fresh(['questions', 'attachments', 'grades'])),
        ]);
    }

    public function destroy(Request $request, Homework $homework): JsonResponse
    {
        $actor = $request->user();
        abort_unless($actor, 401);
        abort_unless((int) $homework->teacher_id === (int) $actor->id, 404);

        foreach ($homework->attachments as $attachment) {
            Storage::disk('public')->delete($attachment->file_path);
        }

        $homework->delete();

        return response()->json([
            'message' => 'Homework deleted successfully.',
        ]);
    }

    /**
     * Guardians of every learner in the homework class, grouped per learner so
     * graded messages can target exactly one child's guardians.
     *
     * @return Collection<int, Collection<int, User>>
     */
    private function guardianGroupsByStudent(Homework $homework): Collection
    {
        return $this->classStudents($homework->school_id, $homework->school_track, $homework->class_name)
            ->loadMissing('guardians')
            ->map(fn (StudentRecord $student) => $student->guardians);
    }

    private function studentGuardians(int $studentRecordId): Collection
    {
        return StudentRecord::query()
            ->find($studentRecordId)
            ?->loadMissing('guardians')
            ->guardians ?? collect();
    }

    /**
     * @return Collection<int, StudentRecord>
     */
    private function classStudents(?int $schoolId, ?string $schoolTrack, ?string $className): Collection
    {
        if (! filled($schoolId) || ! filled($schoolTrack) || ! filled($className)) {
            return collect();
        }

        return StudentRecord::query()
            ->where('school_id', $schoolId)
            ->where('school_track', $schoolTrack)
            ->where('class_name', $className)
            ->orderBy('full_name')
            ->get();
    }

    /**
     * @return array<string, mixed>
     */
    private function serializeHomework(Homework $homework): array
    {
        return [
            'id' => $homework->id,
            'title' => $homework->title,
            'description' => $homework->description,
            'school_track' => $homework->school_track,
            'class_name' => $homework->class_name,
            'due_date' => $homework->due_date?->toIso8601String(),
            'teacher_name' => $homework->teacher?->name,
            'questions' => $homework->questions
                ->map(fn (HomeworkQuestion $question): array => [
                    'id' => $question->id,
                    'position' => $question->position,
                    'question_text' => $question->question_text,
                ])
                ->values(),
            'attachments' => $homework->attachments
                ->map(fn (HomeworkAttachment $attachment): array => [
                    'id' => $attachment->id,
                    'name' => $attachment->original_name,
                    'url' => $attachment->download_url,
                    'mime_type' => $attachment->mime_type,
                    'size_in_kb' => (int) $attachment->size_in_kb,
                    'is_image' => (bool) $attachment->is_image,
                ])
                ->values(),
            'grades' => $homework->grades
                ->map(fn (HomeworkGrade $grade): array => [
                    'student_record_id' => $grade->student_record_id,
                    'grade' => $grade->grade,
                    'remarks' => $grade->remarks,
                    'updated_at' => $grade->updated_at?->toIso8601String(),
                ])
                ->values(),
            'submissions' => $homework->submissions
                ->where('status', HomeworkSubmission::STATUS_SUBMITTED)
                ->sortBy('submitted_at')
                ->values()
                ->map(fn (HomeworkSubmission $submission): array => [
                    'id' => $submission->id,
                    'student_record_id' => $submission->student_record_id,
                    'student_name' => $submission->studentRecord?->full_name ?? 'Learner',
                    'notes' => $submission->notes,
                    'submitted_at' => $submission->submitted_at?->toIso8601String(),
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
                ]),
            'created_at' => $homework->created_at?->toIso8601String(),
        ];
    }
}
