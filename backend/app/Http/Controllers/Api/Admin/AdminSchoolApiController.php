<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\School;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class AdminSchoolApiController extends Controller
{
    public function index(): JsonResponse
    {
        $schools = School::query()
            ->with('lockedBy:id,name')
            ->withCount(['users', 'studentRecords'])
            ->orderBy('name')
            ->get()
            ->map(fn (School $school): array => $this->serializeSchool($school))
            ->values();

        return response()->json([
            'schools' => $schools,
            'stats' => [
                'total' => $schools->count(),
                'locked' => $schools->where('is_locked', true)->count(),
                'unlocked' => $schools->where('is_locked', false)->count(),
            ],
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $request->merge([
            'name' => Str::squish((string) $request->input('name', '')),
        ]);

        $validated = $request->validate([
            'name' => [
                'required',
                'string',
                'max:180',
                Rule::unique('schools', 'name'),
            ],
        ]);

        $school = School::query()->create([
            'name' => $validated['name'],
        ]);

        return response()->json([
            'message' => 'School created successfully.',
            'school' => $this->serializeSchool($school->fresh(['lockedBy'])->loadCount(['users', 'studentRecords'])),
        ], 201);
    }

    public function update(Request $request, School $school): JsonResponse
    {
        $request->merge([
            'name' => Str::squish((string) $request->input('name', '')),
        ]);

        $validated = $request->validate([
            'name' => [
                'required',
                'string',
                'max:180',
                Rule::unique('schools', 'name')->ignore($school),
            ],
        ]);

        $school->update([
            'name' => $validated['name'],
        ]);

        return response()->json([
            'message' => 'School renamed successfully.',
            'school' => $this->serializeSchool($school->fresh(['lockedBy'])->loadCount(['users', 'studentRecords'])),
        ]);
    }

    public function lock(Request $request, School $school): JsonResponse
    {
        $school->update([
            'is_locked' => true,
            'locked_at' => now(),
            'locked_by' => $request->user()?->id,
        ]);

        return response()->json([
            'message' => "{$school->name} has been locked.",
            'school' => $this->serializeSchool($school->fresh(['lockedBy'])->loadCount(['users', 'studentRecords'])),
        ]);
    }

    public function unlock(School $school): JsonResponse
    {
        $school->update([
            'is_locked' => false,
            'locked_at' => null,
            'locked_by' => null,
        ]);

        return response()->json([
            'message' => "{$school->name} has been unlocked.",
            'school' => $this->serializeSchool($school->fresh(['lockedBy'])->loadCount(['users', 'studentRecords'])),
        ]);
    }

    public function destroy(School $school): JsonResponse
    {
        if (School::query()->count() <= 1) {
            return response()->json([
                'message' => 'Create another school before deleting the last school.',
            ], 422);
        }

        DB::transaction(function () use ($school): void {
            $school->delete();
        });

        return response()->json([
            'message' => 'School deleted successfully.',
        ]);
    }

    /**
     * @return array<string, mixed>
     */
    private function serializeSchool(School $school): array
    {
        return [
            'id' => $school->id,
            'name' => $school->name,
            'is_locked' => (bool) $school->is_locked,
            'locked_at' => $school->locked_at?->toIso8601String(),
            'locked_by' => $school->lockedBy ? [
                'id' => $school->lockedBy->id,
                'name' => $school->lockedBy->name,
            ] : null,
            'users_count' => $school->users_count ?? 0,
            'student_records_count' => $school->student_records_count ?? 0,
            'created_at' => $school->created_at?->toIso8601String(),
            'updated_at' => $school->updated_at?->toIso8601String(),
        ];
    }
}
