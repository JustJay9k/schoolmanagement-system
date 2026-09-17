<?php

namespace App\Http\Controllers\Api\Management;

use App\Http\Controllers\Controller;
use App\Http\Requests\Management\ImportStudentRecordsRequest;
use App\Http\Requests\Management\StoreStudentRecordRequest;
use App\Http\Requests\Management\UpdateStudentRecordRequest;
use App\Models\StudentRecord;
use App\Support\SchoolContextOptions;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ManagementStudentRecordApiController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();
        abort_unless($user?->isHeadTeacher() || $user?->canAddStudentRecords(), 403);

        $studentQuery = StudentRecord::query()
            ->where('school_id', $user?->school_id)
            ->when($user?->isTeacher(), function ($query) use ($user): void {
                $query
                    ->where('school_track', $user->school_track)
                    ->where('class_name', $user->assigned_class_name);
            });

        $students = $studentQuery
            ->with('creator:id,name')
            ->orderBy('school_track')
            ->orderBy('class_name')
            ->orderBy('full_name')
            ->get();

        return response()->json([
            'students' => $students->map(fn (StudentRecord $student): array => $this->serializeStudent($student))->values(),
            'stats' => [
                'total' => $students->count(),
                'preschool' => $students->where('school_track', 'preschool')->count(),
                'primary' => $students->where('school_track', 'primary')->count(),
                'secondary' => $students->where('school_track', 'secondary')->count(),
                'classes' => $students->map(fn (StudentRecord $student): string => $student->school_track.'::'.$student->class_name)->unique()->count(),
            ],
            'options' => [
                'enabledTracks' => SchoolContextOptions::enabledTracks($user->school_id),
                'schoolTracks' => $user->isTeacher()
                    ? [$user->school_track => SchoolContextOptions::tracks()[$user->school_track] ?? ucfirst($user->school_track)]
                    : collect(SchoolContextOptions::tracks())->only(SchoolContextOptions::enabledTracks($user->school_id))->all(),
                'classesByTrack' => $user->isTeacher()
                    ? [$user->school_track => [$user->assigned_class_name]]
                    : collect(SchoolContextOptions::classesByTrack($user->school_id))->only(SchoolContextOptions::enabledTracks($user->school_id))->all(),
            ],
        ]);
    }

    public function store(StoreStudentRecordRequest $request): JsonResponse
    {
        $student = StudentRecord::query()->create($this->payload(
            $request->validated(),
            $request->user()?->id,
            $request->user()?->school_id,
        ));

        return response()->json([
            'message' => 'Student record added successfully.',
            'student' => $this->serializeStudent($student->fresh('creator:id,name')),
        ], 201);
    }

    public function import(ImportStudentRecordsRequest $request): JsonResponse
    {
        $validated = $request->validated();
        $created = 0;
        $updated = 0;
        $schoolId = $request->user()?->school_id;

        foreach ($validated['records'] as $row) {
            $lookup = ! empty($row['student_code'])
                ? [
                    'school_id' => $schoolId,
                    'student_code' => $row['student_code'],
                ]
                : [
                    'school_id' => $schoolId,
                    'school_track' => $validated['school_track'],
                    'class_name' => $validated['class_name'],
                    'full_name' => $row['full_name'],
                    'date_of_birth' => $row['date_of_birth'] ?? null,
                ];

            $student = StudentRecord::query()->firstOrNew($lookup);
            $isExisting = $student->exists;

            $student->fill($this->payload([
                ...$row,
                'school_track' => $validated['school_track'],
                'class_name' => $validated['class_name'],
            ], $request->user()?->id, $schoolId));
            $student->save();

            if ($isExisting) {
                $updated++;
            } else {
                $created++;
            }
        }

        return response()->json([
            'message' => 'Student records imported successfully.',
            'summary' => [
                'created' => $created,
                'updated' => $updated,
                'processed' => count($validated['records']),
            ],
        ]);
    }

    public function update(UpdateStudentRecordRequest $request, StudentRecord $student): JsonResponse
    {
        $student->update($this->payload(
            $request->validated(),
            $student->created_by,
            $request->user()?->school_id,
        ));

        return response()->json([
            'message' => 'Student record updated successfully.',
            'student' => $this->serializeStudent($student->fresh('creator:id,name')),
        ]);
    }

    public function destroy(StudentRecord $student): JsonResponse
    {
        abort_unless(
            request()->user()?->canManageTimetables()
                && $student->school_id === request()->user()?->school_id,
            403,
        );

        $student->delete();

        return response()->json([
            'message' => 'Student record deleted successfully.',
        ]);
    }

    /**
     * @param  array<string, mixed>  $validated
     * @return array<string, mixed>
     */
    private function payload(array $validated, ?int $actorId, ?int $schoolId): array
    {
        return [
            'school_id' => $schoolId,
            'school_track' => $validated['school_track'],
            'class_name' => $validated['class_name'],
            'full_name' => $validated['full_name'],
            'sex' => $validated['sex'] ?? null,
            'date_of_birth' => $validated['date_of_birth'] ?? null,
            'age' => $this->resolveAge(
                $validated['age'] ?? null,
                $validated['date_of_birth'] ?? null,
            ),
            'student_code' => $validated['student_code'] ?? null,
            'orphan_status' => $validated['orphan_status'] ?? null,
            'disability_name' => $validated['disability_name'] ?? null,
            'guardian_name' => $validated['guardian_name'] ?? null,
            'guardian_phone' => $validated['guardian_phone'] ?? null,
            'guardian_email' => $validated['guardian_email'] ?? null,
            'residence' => $validated['residence'] ?? null,
            'first_entry_date' => $validated['first_entry_date'] ?? null,
            'created_by' => $actorId,
        ];
    }

    private function resolveAge(mixed $age, mixed $dateOfBirth): ?int
    {
        if (is_numeric($age)) {
            return (int) $age;
        }

        if (! is_string($dateOfBirth) || $dateOfBirth === '') {
            return null;
        }

        return Carbon::parse($dateOfBirth)->age;
    }

    /**
     * @return array<string, mixed>
     */
    private function serializeStudent(StudentRecord $student): array
    {
        return [
            'id' => $student->id,
            'school_id' => $student->school_id,
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
            'fees_balance' => (float) $student->fees_balance,
            'books_paid' => (bool) $student->books_paid,
            'uniform_paid' => (bool) $student->uniform_paid,
            'creator_name' => $student->creator?->name,
            'created_at' => $student->created_at?->toIso8601String(),
        ];
    }
}
