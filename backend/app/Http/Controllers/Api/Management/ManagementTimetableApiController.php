<?php

namespace App\Http\Controllers\Api\Management;

use App\Enums\UserRole;
use App\Enums\UserStatus;
use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\StoreTimetableRequest;
use App\Http\Requests\Admin\UpdateTimetableRequest;
use App\Models\SchoolSubject;
use App\Models\Timetable;
use App\Models\User;
use App\Support\SchoolContextOptions;
use App\Support\TimetableOptions;
use Illuminate\Http\JsonResponse;

class ManagementTimetableApiController extends Controller
{
    public function index(): JsonResponse
    {
        return response()->json([
            'timetables' => Timetable::query()
                ->with(['assignedTeacher:id,name,assigned_class_name', 'creator:id,name', 'entries.subject:id,name,code'])
                ->orderBy('school_track')
                ->orderBy('class_name')
                ->get()
                ->map(fn (Timetable $timetable): array => $this->serializeTimetable($timetable))
                ->values(),
            'options' => $this->options(),
        ]);
    }

    public function show(Timetable $timetable): JsonResponse
    {
        $timetable->load(['assignedTeacher:id,name,assigned_class_name', 'creator:id,name', 'entries.subject:id,name,code']);

        return response()->json([
            'timetable' => $this->serializeTimetable($timetable),
            'options' => $this->options(),
        ]);
    }

    public function store(StoreTimetableRequest $request): JsonResponse
    {
        $validated = $request->validated();

        $timetable = Timetable::query()->create([
            'title' => $validated['title'],
            'school_track' => $validated['school_track'],
            'class_name' => $validated['class_name'],
            'assigned_teacher_id' => $validated['assigned_teacher_id'],
            'created_by' => $request->user()?->id,
            'notes' => $validated['notes'] ?? null,
        ]);

        $timetable->entries()->createMany($validated['entries']);

        return response()->json([
            'message' => 'Timetable created successfully.',
            'timetable' => $this->serializeTimetable(
                $timetable->fresh(['assignedTeacher:id,name,assigned_class_name', 'creator:id,name', 'entries.subject:id,name,code'])
            ),
        ], 201);
    }

    public function update(UpdateTimetableRequest $request, Timetable $timetable): JsonResponse
    {
        $validated = $request->validated();

        $timetable->update([
            'title' => $validated['title'],
            'school_track' => $validated['school_track'],
            'class_name' => $validated['class_name'],
            'assigned_teacher_id' => $validated['assigned_teacher_id'],
            'notes' => $validated['notes'] ?? null,
        ]);

        $timetable->entries()->delete();
        $timetable->entries()->createMany($validated['entries']);

        return response()->json([
            'message' => 'Timetable updated successfully.',
            'timetable' => $this->serializeTimetable(
                $timetable->fresh(['assignedTeacher:id,name,assigned_class_name', 'creator:id,name', 'entries.subject:id,name,code'])
            ),
        ]);
    }

    public function destroy(Timetable $timetable): JsonResponse
    {
        $timetable->delete();

        return response()->json([
            'message' => 'Timetable deleted successfully.',
        ]);
    }

    /**
     * @return array<string, mixed>
     */
    private function options(): array
    {
        $subjectsByTrack = SchoolSubject::query()
            ->orderBy('school_track')
            ->orderBy('name')
            ->get()
            ->groupBy('school_track')
            ->map(fn ($items) => $items->map(fn (SchoolSubject $subject): array => [
                'id' => $subject->id,
                'name' => $subject->name,
                'code' => $subject->code,
            ])->values()->all())
            ->all();

        $teachersByTrack = User::query()
            ->where('role', UserRole::Teacher)
            ->where('status', UserStatus::Active)
            ->orderBy('name')
            ->get()
            ->groupBy('school_track')
            ->map(fn ($items) => $items->map(fn (User $teacher): array => [
                'id' => $teacher->id,
                'name' => $teacher->name,
                'assigned_class_name' => $teacher->assigned_class_name,
            ])->values()->all())
            ->all();

        return [
            'schoolTracks' => SchoolContextOptions::tracks(),
            'classesByTrack' => SchoolContextOptions::classesByTrack(),
            'subjectsByTrack' => $subjectsByTrack,
            'teachersByTrack' => $teachersByTrack,
            'daysOfWeek' => TimetableOptions::daysOfWeek(),
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function serializeTimetable(Timetable $timetable): array
    {
        return [
            'id' => $timetable->id,
            'title' => $timetable->title,
            'school_track' => $timetable->school_track,
            'school_track_label' => SchoolContextOptions::tracks()[$timetable->school_track] ?? ucfirst($timetable->school_track),
            'class_name' => $timetable->class_name,
            'notes' => $timetable->notes,
            'assigned_teacher' => $timetable->assignedTeacher ? [
                'id' => $timetable->assignedTeacher->id,
                'name' => $timetable->assignedTeacher->name,
                'assigned_class_name' => $timetable->assignedTeacher->assigned_class_name,
            ] : null,
            'creator_name' => $timetable->creator?->name,
            'entry_count' => $timetable->entries->count(),
            'entries' => $timetable->entries->map(function ($entry): array {
                return [
                    'id' => $entry->id,
                    'day_of_week' => $entry->day_of_week,
                    'day_of_week_label' => TimetableOptions::daysOfWeek()[$entry->day_of_week] ?? ucfirst($entry->day_of_week),
                    'period_label' => $entry->period_label,
                    'start_time' => $entry->start_time?->format('H:i'),
                    'end_time' => $entry->end_time?->format('H:i'),
                    'room' => $entry->room,
                    'notes' => $entry->notes,
                    'subject' => $entry->subject ? [
                        'id' => $entry->subject->id,
                        'name' => $entry->subject->name,
                        'code' => $entry->subject->code,
                    ] : null,
                ];
            })->values(),
            'created_at' => $timetable->created_at?->toIso8601String(),
        ];
    }
}
