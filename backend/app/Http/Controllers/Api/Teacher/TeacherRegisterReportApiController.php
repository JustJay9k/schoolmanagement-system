<?php

namespace App\Http\Controllers\Api\Teacher;

use App\Http\Controllers\Controller;
use App\Http\Requests\Teacher\SaveTeacherRegisterReportRequest;
use App\Models\RegisterReport;
use App\Models\StudentRecord;
use App\Models\User;
use App\Support\UserNotificationCenter;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;

class TeacherRegisterReportApiController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $actor = $request->user();

        abort_unless($actor && $actor->isTeacher(), 403);

        $reports = RegisterReport::query()
            ->where('school_id', $actor->school_id)
            ->where('teacher_id', $actor->id)
            ->orderByDesc('report_date')
            ->orderByDesc('updated_at')
            ->get();

        return response()->json([
            'reports' => $reports->map(
                fn (RegisterReport $report): array => $this->serializeReport($report),
            )->values(),
        ]);
    }

    public function storeOrUpdateCurrent(
        SaveTeacherRegisterReportRequest $request,
    ): JsonResponse {
        $actor = $request->user();

        abort_unless($actor && $actor->isTeacher(), 403);

        $validated = $request->validated();
        $this->guardTeacherScope($actor, $validated['school_track'], $validated['class_name']);

        $studentRecords = $this->resolveStudentRecords(
            $actor,
            $validated['school_track'],
            $validated['class_name'],
            $validated['entries'],
        );

        $report = RegisterReport::query()->firstOrNew([
            'school_id' => $actor->school_id,
            'teacher_id' => $actor->id,
            'school_track' => $validated['school_track'],
            'class_name' => $validated['class_name'],
            'report_date' => now()->toDateString(),
        ]);

        if ($report->exists && $report->isSubmitted()) {
            return response()->json([
                'message' => 'This register has already been sent to the head teacher and can no longer be edited.',
            ], 409);
        }

        $entries = collect($validated['entries'])
            ->map(function (array $entry) use ($studentRecords): array {
                /** @var StudentRecord $student */
                $student = $studentRecords->firstWhere('id', (int) $entry['student_id']);

                return [
                    'student_id' => $student->id,
                    'student_name' => $student->full_name,
                    'student_code' => $student->student_code,
                    'status' => $entry['status'],
                    'note' => isset($entry['note']) ? trim((string) $entry['note']) : '',
                ];
            })
            ->values()
            ->all();

        $report->fill([
            'teacher_name' => $actor->name,
            'status' => 'draft',
            'submitted_at' => null,
            'periods' => array_values($validated['periods']),
            'entries' => $entries,
            'summary' => $this->buildSummary($entries),
        ])->save();

        return response()->json([
            'message' => 'Register draft saved. Review it in Registers before sending it to the head teacher.',
            'report' => $this->serializeReport($report->fresh()),
        ]);
    }

    public function update(
        SaveTeacherRegisterReportRequest $request,
        RegisterReport $report,
    ): JsonResponse {
        $actor = $request->user();

        abort_unless($actor && $actor->isTeacher(), 403);
        $this->guardTeacherAccess($report, $actor);

        if ($report->isSubmitted()) {
            return response()->json([
                'message' => 'This register has already been sent to the head teacher and can no longer be edited.',
            ], 409);
        }

        $validated = $request->validated();
        $this->guardTeacherScope($actor, $validated['school_track'], $validated['class_name']);

        if (
            $report->school_track !== $validated['school_track']
            || $report->class_name !== $validated['class_name']
        ) {
            return response()->json([
                'message' => 'Draft reports must stay in the original class and track scope.',
            ], 422);
        }

        $studentRecords = $this->resolveStudentRecords(
            $actor,
            $validated['school_track'],
            $validated['class_name'],
            $validated['entries'],
        );

        $entries = collect($validated['entries'])
            ->map(function (array $entry) use ($studentRecords): array {
                /** @var StudentRecord $student */
                $student = $studentRecords->firstWhere('id', (int) $entry['student_id']);

                return [
                    'student_id' => $student->id,
                    'student_name' => $student->full_name,
                    'student_code' => $student->student_code,
                    'status' => $entry['status'],
                    'note' => isset($entry['note']) ? trim((string) $entry['note']) : '',
                ];
            })
            ->values()
            ->all();

        $report->fill([
            'teacher_name' => $actor->name,
            'periods' => array_values($validated['periods']),
            'entries' => $entries,
            'summary' => $this->buildSummary($entries),
        ])->save();

        return response()->json([
            'message' => 'Register draft updated successfully.',
            'report' => $this->serializeReport($report->fresh()),
        ]);
    }

    public function submit(Request $request, RegisterReport $report): JsonResponse
    {
        $actor = $request->user();

        abort_unless($actor && $actor->isTeacher(), 403);
        $this->guardTeacherAccess($report, $actor);

        if ($report->isSubmitted()) {
            return response()->json([
                'message' => 'This register has already been sent to the head teacher.',
                'report' => $this->serializeReport($report),
            ]);
        }

        $report->forceFill([
            'status' => 'submitted',
            'submitted_at' => now(),
        ])->save();

        User::query()
            ->where('school_id', $actor->school_id)
            ->where('role', 'management')
            ->get()
            ->each(function (User $manager) use ($actor, $report): void {
                UserNotificationCenter::createForUser(
                    $manager,
                    'New register report submitted',
                    "{$actor->name} submitted the {$report->class_name} register for {$report->report_date?->format('d M Y')}.",
                    'info',
                    '/registers',
                );
            });

        return response()->json([
            'message' => 'Register sent to the head teacher successfully.',
            'report' => $this->serializeReport($report->fresh()),
        ]);
    }

    /**
     * @param  array<int, array<string, mixed>>  $entries
     * @return Collection<int, StudentRecord>
     */
    private function resolveStudentRecords(
        User $actor,
        string $schoolTrack,
        string $className,
        array $entries,
    ): Collection {
        $studentIds = collect($entries)
            ->pluck('student_id')
            ->map(fn (mixed $id): int => (int) $id)
            ->unique()
            ->values();

        $students = StudentRecord::query()
            ->where('school_id', $actor->school_id)
            ->where('school_track', $schoolTrack)
            ->where('class_name', $className)
            ->whereIn('id', $studentIds)
            ->orderBy('full_name')
            ->get();

        if ($students->count() !== $studentIds->count()) {
            abort(422, 'One or more learner entries are outside your assigned class scope.');
        }

        return $students;
    }

    private function guardTeacherScope(User $actor, string $schoolTrack, string $className): void
    {
        if (
            ! filled($actor->school_track)
            || ! filled($actor->assigned_class_name)
            || $actor->school_track !== $schoolTrack
            || $actor->assigned_class_name !== $className
        ) {
            abort(422, 'This register payload does not match the teacher assignment.');
        }
    }

    private function guardTeacherAccess(RegisterReport $report, User $actor): void
    {
        if (
            $report->school_id !== $actor->school_id
            || (int) $report->teacher_id !== (int) $actor->id
        ) {
            abort(404);
        }
    }

    /**
     * @param  array<int, array<string, mixed>>  $entries
     * @return array<string, mixed>
     */
    private function buildSummary(array $entries): array
    {
        $counts = [
            'P' => 0,
            'L' => 0,
            'S' => 0,
            'A' => 0,
            'E' => 0,
        ];

        foreach ($entries as $entry) {
            $status = $entry['status'] ?? null;

            if (is_string($status) && array_key_exists($status, $counts)) {
                $counts[$status]++;
            }
        }

        return [
            'total_students' => count($entries),
            'counts' => $counts,
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function serializeReport(RegisterReport $report): array
    {
        return [
            'id' => $report->id,
            'teacher_id' => $report->teacher_id,
            'teacher_name' => $report->teacher_name,
            'school_track' => $report->school_track,
            'class_name' => $report->class_name,
            'report_date' => $report->report_date?->toDateString(),
            'status' => $report->status,
            'submitted_at' => $report->submitted_at?->toIso8601String(),
            'periods' => $report->periods ?? [],
            'entries' => $report->entries ?? [],
            'summary' => $report->summary ?? [
                'total_students' => 0,
                'counts' => [],
            ],
            'updated_at' => $report->updated_at?->toIso8601String(),
        ];
    }
}
