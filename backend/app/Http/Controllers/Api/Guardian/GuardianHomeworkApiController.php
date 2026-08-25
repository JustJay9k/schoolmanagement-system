<?php

namespace App\Http\Controllers\Api\Guardian;

use App\Http\Controllers\Controller;
use App\Models\Homework;
use App\Models\HomeworkAttachment;
use App\Models\HomeworkGrade;
use App\Models\StudentRecord;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class GuardianHomeworkApiController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $guardian = $request->user();

        abort_unless($guardian?->isGuardian(), 403);

        /** @var StudentRecord|null $child */
        $child = $guardian->linkedStudentRecord()->first();

        if (! $child || ($guardian->school_id && $child->school_id !== $guardian->school_id)) {
            return response()->json([
                'message' => 'No learner record is linked to this guardian account yet. Contact the school administrator.',
                'child' => null,
                'homework' => [],
            ]);
        }

        $homework = Homework::query()
            ->where('school_id', $child->school_id)
            ->where('school_track', $child->school_track)
            ->where('class_name', $child->class_name)
            ->with([
                'teacher:id,name',
                'questions',
                'attachments',
                'grades' => fn ($query) => $query->where('student_record_id', $child->id),
            ])
            ->latest()
            ->get();

        return response()->json([
            'child' => [
                'id' => $child->id,
                'full_name' => $child->full_name,
                'class_name' => $child->class_name,
                'school_track_label' => ucfirst((string) $child->school_track),
            ],
            'homework' => $homework
                ->map(fn (Homework $item): array => $this->serializeHomework($item, $child))
                ->values(),
        ]);
    }

    /**
     * @return array<string, mixed>
     */
    private function serializeHomework(Homework $homework, StudentRecord $child): array
    {
        /** @var HomeworkGrade|null $myGrade */
        $myGrade = $homework->grades->first();

        return [
            'id' => $homework->id,
            'title' => $homework->title,
            'description' => $homework->description,
            'class_name' => $homework->class_name,
            'due_date' => $homework->due_date?->toIso8601String(),
            'teacher_name' => $homework->teacher?->name ?? 'Teacher',
            'questions' => $homework->questions
                ->sortBy('position')
                ->values()
                ->map(fn ($question, int $index): array => [
                    'id' => $question->id,
                    'position' => $index + 1,
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
            'my_grade' => $myGrade ? [
                'grade' => $myGrade->grade,
                'remarks' => $myGrade->remarks,
                'graded_at' => $myGrade->updated_at?->toIso8601String(),
            ] : null,
            'created_at' => $homework->created_at?->toIso8601String(),
        ];
    }
}
