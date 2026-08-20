<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\School;
use App\Models\StudentRecord;
use App\Support\SchoolContextOptions;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AdminDeletedStudentRecordApiController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $filters = [
            'search' => trim((string) $request->string('search')),
            'school' => $request->string('school')->toString(),
            'track' => $request->string('track')->toString(),
        ];

        $students = StudentRecord::query()
            ->onlyTrashed()
            ->with(['school:id,name', 'creator:id,name'])
            ->when($filters['search'] !== '', function ($query) use ($filters): void {
                $query->where(function ($nestedQuery) use ($filters): void {
                    $nestedQuery
                        ->where('full_name', 'like', '%'.$filters['search'].'%')
                        ->orWhere('student_code', 'like', '%'.$filters['search'].'%')
                        ->orWhere('guardian_name', 'like', '%'.$filters['search'].'%');
                });
            })
            ->when($filters['school'] !== '', function ($query) use ($filters): void {
                if ($filters['school'] === 'unassigned') {
                    $query->whereNull('school_id');

                    return;
                }

                $query->where('school_id', $filters['school']);
            })
            ->when($filters['track'] !== '', fn ($query) => $query->where('school_track', $filters['track']))
            ->orderByDesc('deleted_at')
            ->get();

        return response()->json([
            'students' => $students->map(fn (StudentRecord $student): array => $this->serializeStudent($student))->values(),
            'filters' => $filters,
            'stats' => [
                'total' => StudentRecord::onlyTrashed()->count(),
                'primary' => StudentRecord::onlyTrashed()->where('school_track', 'primary')->count(),
                'secondary' => StudentRecord::onlyTrashed()->where('school_track', 'secondary')->count(),
                'schools' => StudentRecord::onlyTrashed()->whereNotNull('school_id')->distinct('school_id')->count('school_id'),
            ],
            'options' => [
                'schools' => School::query()
                    ->orderBy('name')
                    ->get(['id', 'name'])
                    ->map(fn (School $school): array => [
                        'value' => (string) $school->id,
                        'label' => $school->name,
                    ])
                    ->values(),
                'schoolTracks' => SchoolContextOptions::tracks(),
            ],
        ]);
    }

    public function restore(int $student): JsonResponse
    {
        $record = StudentRecord::onlyTrashed()->findOrFail($student);
        $record->restore();

        return response()->json([
            'message' => 'Student record restored successfully.',
            'student' => $this->serializeStudent($record->fresh(['school:id,name', 'creator:id,name'])),
        ]);
    }

    public function destroy(int $student): JsonResponse
    {
        $record = StudentRecord::onlyTrashed()->findOrFail($student);
        $record->forceDelete();

        return response()->json([
            'message' => 'Student record permanently deleted successfully.',
        ]);
    }

    /**
     * @return array<string, mixed>
     */
    private function serializeStudent(StudentRecord $student): array
    {
        return [
            'id' => $student->id,
            'school_id' => $student->school_id,
            'school_name' => $student->school?->name,
            'school_track' => $student->school_track,
            'school_track_label' => SchoolContextOptions::tracks()[$student->school_track] ?? ucfirst($student->school_track),
            'class_name' => $student->class_name,
            'full_name' => $student->full_name,
            'sex' => $student->sex,
            'date_of_birth' => $student->date_of_birth?->format('Y-m-d'),
            'age' => $student->resolvedAge(),
            'student_code' => $student->student_code,
            'orphan_status' => $student->orphan_status,
            'disability_name' => $student->disability_name,
            'guardian_name' => $student->guardian_name,
            'guardian_phone' => $student->guardian_phone,
            'guardian_email' => $student->guardian_email,
            'residence' => $student->residence,
            'first_entry_date' => $student->first_entry_date?->format('Y-m-d'),
            'creator_name' => $student->creator?->name,
            'created_at' => $student->created_at?->toIso8601String(),
            'deleted_at' => $student->deleted_at?->toIso8601String(),
        ];
    }
}
