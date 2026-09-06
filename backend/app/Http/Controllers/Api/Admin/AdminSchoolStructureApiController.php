<?php

namespace App\Http\Controllers\Api\Admin;

use App\Enums\UserRole;
use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\UpdateSchoolStructureRequest;
use App\Models\StudentPerformanceRecord;
use App\Models\User;
use App\Support\SchoolContextOptions;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class AdminSchoolStructureApiController extends Controller
{
    public function show(Request $request): JsonResponse
    {
        $schoolId = $this->resolveSchoolId($request);

        abort_unless(
            $request->user()?->canManageSchoolStructure() && $schoolId,
            403,
            'You do not have permission to manage the school structure.',
        );

        return response()->json([
            'schoolId' => $schoolId,
            'classesByTrack' => SchoolContextOptions::classesByTrack($schoolId),
            'defaultClassesByTrack' => SchoolContextOptions::defaultClassesByTrack(),
            'teacherCountsByTrack' => [
                'primary' => User::query()
                    ->where('role', UserRole::Teacher)
                    ->where('school_id', $schoolId)
                    ->where('school_track', 'primary')
                    ->count(),
                'secondary' => User::query()
                    ->where('role', UserRole::Teacher)
                    ->where('school_id', $schoolId)
                    ->where('school_track', 'secondary')
                    ->count(),
            ],
            'activeTerm' => SchoolContextOptions::activeTerm($schoolId),
            'terms' => array_map(
                fn (string $key, string $label): array => [
                    'value' => $key,
                    'label' => $label,
                ],
                array_keys(StudentPerformanceRecord::termLabels()),
                StudentPerformanceRecord::termLabels(),
            ),
        ]);
    }

    public function update(UpdateSchoolStructureRequest $request): JsonResponse
    {
        $schoolId = $this->resolveSchoolId($request);

        abort_unless($schoolId, 403, 'Choose a school before updating the school structure.');

        SchoolContextOptions::saveClassesByTrack($request->input('classes_by_track', []), $schoolId);

        return response()->json([
            'message' => 'School structure updated successfully.',
            'schoolId' => $schoolId,
            'classesByTrack' => SchoolContextOptions::classesByTrack($schoolId),
        ]);
    }

    public function updateActiveTerm(Request $request): JsonResponse
    {
        $schoolId = $this->resolveSchoolId($request);

        abort_unless(
            $request->user()?->canManageSchoolStructure() && $schoolId,
            403,
            'You do not have permission to manage the school structure.',
        );

        $validated = $request->validate([
            'term' => ['required', 'string', Rule::in(array_keys(StudentPerformanceRecord::termLabels()))],
        ]);

        SchoolContextOptions::saveActiveTerm($validated['term'], $schoolId);

        return response()->json([
            'message' => 'Active term updated successfully.',
            'activeTerm' => SchoolContextOptions::activeTerm($schoolId),
            'terms' => array_map(
                fn (string $key, string $label): array => [
                    'value' => $key,
                    'label' => $label,
                ],
                array_keys(StudentPerformanceRecord::termLabels()),
                StudentPerformanceRecord::termLabels(),
            ),
        ]);
    }

    private function resolveSchoolId(Request $request): ?int
    {
        $requestedSchoolId = $request->integer('school_id') ?: null;

        if ($request->user()?->isAdmin() && $requestedSchoolId) {
            return $requestedSchoolId;
        }

        return $request->user()?->school_id;
    }
}
