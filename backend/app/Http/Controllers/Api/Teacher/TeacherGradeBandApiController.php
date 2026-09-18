<?php

namespace App\Http\Controllers\Api\Teacher;

use App\Http\Controllers\Controller;
use App\Models\SchoolGradeBand;
use App\Support\GradeBands;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class TeacherGradeBandApiController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $actor = $request->user();

        abort_unless($actor && ($actor->isTeacher() || $actor->canManageTimetables()), 403);

        return response()->json([
            'gradeBands' => GradeBands::forSchool($actor->school_id),
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $actor = $request->user();

        abort_unless($actor && ($actor->isTeacher() || $actor->canManageTimetables()), 403);

        if (! $actor->school_id) {
            return response()->json([
                'message' => 'Assign this account to a school before defining grade bands.',
                'errors' => [
                    'school_id' => ['Assign this account to a school before defining grade bands.'],
                ],
            ], 422);
        }

        $validated = $request->validate([
            'letter' => ['required', 'string', 'max:4'],
            'min_percentage' => ['required', 'integer', 'min:0', 'max:100'],
            'max_percentage' => ['required', 'integer', 'min:0', 'max:100', 'gte:min_percentage'],
        ]);

        $band = SchoolGradeBand::query()->create([
            'school_id' => $actor->school_id,
            'letter' => mb_strtoupper(trim($validated['letter'])),
            'min_percentage' => $validated['min_percentage'],
            'max_percentage' => $validated['max_percentage'],
            'created_by' => $actor->id,
        ]);

        return response()->json([
            'message' => 'Grade band saved successfully.',
            'gradeBand' => GradeBands::serialize($band),
        ], 201);
    }

    public function update(Request $request, SchoolGradeBand $band): JsonResponse
    {
        $actor = $request->user();

        abort_unless($actor && ($actor->isTeacher() || $actor->canManageTimetables()), 403);
        abort_unless($band->school_id === $actor->school_id, 404);

        $validated = $request->validate([
            'letter' => ['required', 'string', 'max:4'],
            'min_percentage' => ['required', 'integer', 'min:0', 'max:100'],
            'max_percentage' => ['required', 'integer', 'min:0', 'max:100', 'gte:min_percentage'],
        ]);

        $band->update([
            'letter' => mb_strtoupper(trim($validated['letter'])),
            'min_percentage' => $validated['min_percentage'],
            'max_percentage' => $validated['max_percentage'],
        ]);

        return response()->json([
            'message' => 'Grade band updated successfully.',
            'gradeBand' => GradeBands::serialize($band->fresh()),
        ]);
    }

    public function destroy(Request $request, SchoolGradeBand $band): JsonResponse
    {
        $actor = $request->user();

        abort_unless($actor && ($actor->isTeacher() || $actor->canManageTimetables()), 403);
        abort_unless($band->school_id === $actor->school_id, 404);

        $band->delete();

        return response()->json([
            'message' => 'Grade band removed successfully.',
        ]);
    }
}