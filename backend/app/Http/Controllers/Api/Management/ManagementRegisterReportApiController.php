<?php

namespace App\Http\Controllers\Api\Management;

use App\Http\Controllers\Controller;
use App\Models\RegisterReport;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ManagementRegisterReportApiController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $actor = $request->user();

        abort_unless($actor && $actor->canManageTimetables(), 403);

        $reports = RegisterReport::query()
            ->where('school_id', $actor->school_id)
            ->with('teacher:id,name')
            ->orderByRaw("case when status = 'submitted' then 0 else 1 end")
            ->orderByDesc('report_date')
            ->orderByDesc('updated_at')
            ->get();

        $teachers = User::query()
            ->where('school_id', $actor->school_id)
            ->where('role', 'teacher')
            ->orderBy('name')
            ->get(['id', 'name']);

        return response()->json([
            'reports' => $reports->map(
                fn (RegisterReport $report): array => $this->serializeReport($report),
            )->values(),
            'teachers' => $teachers->map(fn (User $teacher): array => [
                'id' => $teacher->id,
                'name' => $teacher->name,
            ])->values(),
        ]);
    }

    /**
     * @return array<string, mixed>
     */
    private function serializeReport(RegisterReport $report): array
    {
        return [
            'id' => $report->id,
            'teacher_id' => $report->teacher_id,
            'teacher_name' => $report->teacher?->name ?? $report->teacher_name,
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
