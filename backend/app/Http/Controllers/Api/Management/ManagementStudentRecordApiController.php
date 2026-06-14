<?php

namespace App\Http\Controllers\Api\Management;

use App\Http\Controllers\Controller;
use App\Http\Requests\Management\ImportStudentRecordsRequest;
use App\Http\Requests\Management\StoreStudentRecordRequest;
use App\Models\StudentRecord;
use App\Support\SchoolContextOptions;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;

class ManagementStudentRecordApiController extends Controller
{
    public function index(): JsonResponse
    {
        $students = StudentRecord::query()
            ->with('creator:id,name')
            ->orderBy('school_track')
            ->orderBy('class_name')
            ->orderBy('full_name')
            ->get();

        return response()->json([
            'students' => $students->map(fn (StudentRecord $student): array => $this->serializeStudent($student))->values(),
            'stats' => [
                'total' => $students->count(),
                'primary' => $students->where('school_track', 'primary')->count(),
                'secondary' => $students->where('school_track', 'secondary')->count(),
                'classes' => $students->map(fn (StudentRecord $student): string => $student->school_track.'::'.$student->class_name)->unique()->count(),
            ],
            'options' => [
                'schoolTracks' => SchoolContextOptions::tracks(),
                'classesByTrack' => SchoolContextOptions::classesByTrack(),
            ],
        ]);
    }

    public function store(StoreStudentRecordRequest $request): JsonResponse
    {
        $student = StudentRecord::query()->create($this->payload(
            $request->validated(),
            $request->user()?->id,
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

        foreach ($validated['records'] as $row) {
            $lookup = ! empty($row['student_code'])
                ? ['student_code' => $row['student_code']]
                : [
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
            ], $request->user()?->id));
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

    /**
     * @param  array<string, mixed>  $validated
     * @return array<string, mixed>
     */
    private function payload(array $validated, ?int $actorId): array
    {
        return [
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
            'residence' => $student->residence,
            'first_entry_date' => $student->first_entry_date?->format('Y-m-d'),
            'creator_name' => $student->creator?->name,
            'created_at' => $student->created_at?->toIso8601String(),
        ];
    }
}
