<?php

namespace App\Http\Controllers\Api\Guardian;

use App\Http\Controllers\Controller;
use App\Models\StudentRecord;
use App\Support\SchoolContextOptions;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class GuardianChildApiController extends Controller
{
    public function show(Request $request): JsonResponse
    {
        $guardian = $request->user();

        abort_unless($guardian?->isGuardian(), 403);

        $student = $guardian->linkedStudentRecord()
            ->with([
                'school:id,name',
                'performanceRecords' => fn ($query) => $query
                    ->with('teacher:id,name')
                    ->latest(),
            ])
            ->first();

        if (! $student || ($guardian->school_id && $student->school_id !== $guardian->school_id)) {
            return response()->json([
                'message' => 'No learner record is linked to this guardian account yet. Contact the school administrator.',
                'child' => null,
                'announcements' => [],
            ]);
        }

        return response()->json([
            'child' => $this->serializeStudent($student),
            'announcements' => $guardian->notifications()
                ->limit(5)
                ->get()
                ->map(fn ($notification): array => [
                    'id' => $notification->id,
                    'title' => $notification->title,
                    'message' => $notification->message,
                    'level' => $notification->level,
                    'read_at' => $notification->read_at?->toIso8601String(),
                    'created_at' => $notification->created_at?->toIso8601String(),
                ])
                ->values(),
        ]);
    }

    /**
     * @return array<string, mixed>
     */
    private function serializeStudent(StudentRecord $student): array
    {
        $performanceRecords = $student->performanceRecords
            ->map(fn ($record): array => [
                'id' => $record->id,
                'teacher_name' => $record->teacher?->name ?? 'Teacher',
                'grade' => $record->grade,
                'comment' => $record->comment,
                'updated_at' => $record->updated_at?->toIso8601String(),
            ])
            ->values();

        return [
            'id' => $student->id,
            'full_name' => $student->full_name,
            'school_track' => $student->school_track,
            'school_track_label' => SchoolContextOptions::tracks()[$student->school_track] ?? ucfirst($student->school_track),
            'class_name' => $student->class_name,
            'student_code' => $student->student_code,
            'sex' => $student->sex,
            'date_of_birth' => $student->date_of_birth?->format('Y-m-d'),
            'age' => $student->resolvedAge(),
            'guardian_name' => $student->guardian_name,
            'residence' => $student->residence,
            'first_entry_date' => $student->first_entry_date?->format('Y-m-d'),
            'school_name' => $student->school?->name,
            'latest_grade' => $performanceRecords[0]['grade'] ?? null,
            'latest_comment' => $performanceRecords[0]['comment'] ?? null,
            'latest_updated_at' => $performanceRecords[0]['updated_at'] ?? null,
            'performance_records' => $performanceRecords,
        ];
    }
}
