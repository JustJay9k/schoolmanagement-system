<?php

namespace App\Http\Controllers\Api\Finance;

use App\Http\Controllers\Controller;
use App\Http\Requests\Finance\UpdateStudentFinanceRequest;
use App\Models\StudentRecord;
use App\Support\SchoolContextOptions;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class FinanceStudentApiController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $filters = [
            'search' => trim((string) $request->string('search')),
            'school_track' => $request->string('school_track')->toString(),
            'class_name' => $request->string('class_name')->toString(),
        ];

        $students = StudentRecord::query()
            ->where('school_id', $request->user()?->school_id)
            ->when($filters['search'] !== '', function ($query) use ($filters) {
                $query->where(function ($nestedQuery) use ($filters) {
                    $nestedQuery
                        ->where('full_name', 'like', '%'.$filters['search'].'%')
                        ->orWhere('student_code', 'like', '%'.$filters['search'].'%')
                        ->orWhere('guardian_name', 'like', '%'.$filters['search'].'%');
                });
            })
            ->when($filters['school_track'] !== '', fn ($query) => $query->where('school_track', $filters['school_track']))
            ->when($filters['class_name'] !== '', fn ($query) => $query->where('class_name', $filters['class_name']))
            ->orderBy('school_track')
            ->orderBy('class_name')
            ->orderBy('full_name')
            ->get();

        return response()->json([
            'students' => $students->map(fn (StudentRecord $student): array => $this->serializeStudent($student))->values(),
            'filters' => $filters,
            'stats' => [
                'total_students' => $students->count(),
                'outstanding_balance' => round($students->sum('fees_balance'), 2),
                'books_pending' => $students->where('books_paid', false)->count(),
                'uniform_pending' => $students->where('uniform_paid', false)->count(),
            ],
            'options' => [
                'schoolTracks' => SchoolContextOptions::tracks(),
                'classesByTrack' => SchoolContextOptions::classesByTrack($request->user()?->school_id),
            ],
        ]);
    }

    public function update(UpdateStudentFinanceRequest $request, StudentRecord $student): JsonResponse
    {
        if ($student->school_id !== $request->user()?->school_id) {
            abort(404);
        }

        $student->update($request->validated());

        return response()->json([
            'message' => 'Student finance record updated successfully.',
            'student' => $this->serializeStudent($student->fresh()),
        ]);
    }

    /**
     * @return array<string, mixed>
     */
    private function serializeStudent(StudentRecord $student): array
    {
        return [
            'id' => $student->id,
            'school_track' => $student->school_track,
            'school_track_label' => SchoolContextOptions::tracks()[$student->school_track] ?? ucfirst($student->school_track),
            'class_name' => $student->class_name,
            'full_name' => $student->full_name,
            'sex' => $student->sex,
            'date_of_birth' => $student->date_of_birth?->format('Y-m-d'),
            'age' => $student->resolvedAge(),
            'student_code' => $student->student_code,
            'guardian_name' => $student->guardian_name,
            'residence' => $student->residence,
            'first_entry_date' => $student->first_entry_date?->format('Y-m-d'),
            'fees_balance' => (float) $student->fees_balance,
            'books_paid' => (bool) $student->books_paid,
            'uniform_paid' => (bool) $student->uniform_paid,
        ];
    }
}
