<?php

namespace App\Http\Controllers\Api\Management;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\StoreSchoolSubjectRequest;
use App\Http\Requests\Admin\UpdateSchoolSubjectRequest;
use App\Models\SchoolSubject;
use App\Support\SchoolContextOptions;
use Illuminate\Http\JsonResponse;

class ManagementSchoolSubjectApiController extends Controller
{
    public function index(): JsonResponse
    {
        $subjects = SchoolSubject::query()
            ->with('creator:id,name')
            ->orderBy('school_track')
            ->orderBy('name')
            ->get()
            ->map(fn (SchoolSubject $subject): array => $this->serializeSubject($subject))
            ->values();

        return response()->json([
            'subjects' => $subjects,
            'stats' => [
                'total' => $subjects->count(),
                'primary' => $subjects->where('school_track', 'primary')->count(),
                'secondary' => $subjects->where('school_track', 'secondary')->count(),
            ],
            'options' => [
                'schoolTracks' => SchoolContextOptions::tracks(),
            ],
        ]);
    }

    public function store(StoreSchoolSubjectRequest $request): JsonResponse
    {
        $validated = $request->validated();

        $subject = SchoolSubject::query()->create([
            'name' => $validated['name'],
            'code' => $validated['code'] ?: null,
            'school_track' => $validated['school_track'],
            'created_by' => $request->user()?->id,
        ]);

        return response()->json([
            'message' => 'Subject saved successfully.',
            'subject' => $this->serializeSubject($subject->fresh('creator:id,name')),
        ], 201);
    }

    public function update(UpdateSchoolSubjectRequest $request, SchoolSubject $subject): JsonResponse
    {
        $validated = $request->validated();

        $subject->update([
            'name' => $validated['name'],
            'code' => $validated['code'] ?: null,
            'school_track' => $validated['school_track'],
        ]);

        return response()->json([
            'message' => 'Subject updated successfully.',
            'subject' => $this->serializeSubject($subject->fresh('creator:id,name')),
        ]);
    }

    public function destroy(SchoolSubject $subject): JsonResponse
    {
        if ($subject->timetableEntries()->exists()) {
            return response()->json([
                'message' => 'Validation failed.',
                'errors' => [
                    'subject' => ['This subject is already used in a timetable. Remove or change those timetable entries first.'],
                ],
            ], 422);
        }

        $subject->delete();

        return response()->json([
            'message' => 'Subject deleted successfully.',
        ]);
    }

    /**
     * @return array<string, mixed>
     */
    private function serializeSubject(SchoolSubject $subject): array
    {
        return [
            'id' => $subject->id,
            'name' => $subject->name,
            'code' => $subject->code,
            'school_track' => $subject->school_track,
            'school_track_label' => SchoolContextOptions::tracks()[$subject->school_track] ?? ucfirst($subject->school_track),
            'creator_name' => $subject->creator?->name,
            'created_at' => $subject->created_at?->toIso8601String(),
        ];
    }
}
