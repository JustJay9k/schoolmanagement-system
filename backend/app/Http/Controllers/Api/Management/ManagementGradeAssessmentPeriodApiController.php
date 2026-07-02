<?php

namespace App\Http\Controllers\Api\Management;

use App\Http\Controllers\Controller;
use App\Models\GradeAssessmentPeriod;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class ManagementGradeAssessmentPeriodApiController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $actor = $request->user();

        abort_unless($actor?->canManageTimetables(), 403);

        return response()->json([
            'periods' => $this->queryForSchool((int) $actor->school_id)
                ->get()
                ->map(fn (GradeAssessmentPeriod $period): array => $this->serializePeriod($period))
                ->values(),
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $actor = $request->user();

        abort_unless($actor?->canManageTimetables(), 403);

        if (! $actor->school_id) {
            return response()->json([
                'message' => 'Assign this management account to a school before adding grade criteria.',
                'errors' => [
                    'school_id' => ['Assign this management account to a school before adding grade criteria.'],
                ],
            ], 422);
        }

        $validated = $request->validate([
            'name' => [
                'required',
                'string',
                'max:120',
                Rule::unique('grade_assessment_periods', 'name')->where(
                    fn ($query) => $query->where('school_id', $actor->school_id),
                ),
            ],
        ]);

        $period = GradeAssessmentPeriod::query()->create([
            'school_id' => $actor->school_id,
            'name' => trim($validated['name']),
            'position' => (int) GradeAssessmentPeriod::query()
                ->where('school_id', $actor->school_id)
                ->max('position') + 1,
            'created_by' => $actor->id,
        ]);

        return response()->json([
            'message' => 'Grade criteria saved successfully.',
            'period' => $this->serializePeriod($period),
        ], 201);
    }

    public function destroy(Request $request, GradeAssessmentPeriod $period): JsonResponse
    {
        $actor = $request->user();

        abort_unless($actor?->canManageTimetables(), 403);

        if ($period->school_id !== $actor->school_id) {
            abort(404);
        }

        if ($period->performanceRecords()->exists()) {
            return response()->json([
                'message' => 'This grade criterion already has saved learner records.',
                'errors' => [
                    'period' => [
                        'This grade criterion already has saved learner records. Remove those learner grades first.',
                    ],
                ],
            ], 422);
        }

        $period->delete();

        return response()->json([
            'message' => 'Grade criterion deleted successfully.',
        ]);
    }

    private function queryForSchool(int $schoolId)
    {
        return GradeAssessmentPeriod::query()
            ->where('school_id', $schoolId)
            ->orderBy('position')
            ->orderBy('name');
    }

    /**
     * @return array<string, mixed>
     */
    private function serializePeriod(GradeAssessmentPeriod $period): array
    {
        return [
            'id' => $period->id,
            'name' => $period->name,
            'position' => $period->position,
            'created_at' => $period->created_at?->toIso8601String(),
        ];
    }
}
