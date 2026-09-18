<?php

namespace App\Http\Controllers\Api\Teacher;

use App\Http\Controllers\Controller;
use App\Http\Requests\Teacher\StoreTeacherTimetableRequest;
use App\Http\Requests\Teacher\UpdateTeacherTimetableRequest;
use App\Models\TeacherSubjectAssignment;
use App\Models\SchoolSubject;
use App\Models\Timetable;
use App\Models\TimetableEntry;
use App\Support\SchoolContextOptions;
use App\Support\TimetableOptions;
use Illuminate\Support\Collection;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class TeacherTimetableApiController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $teacher = $request->user();

        abort_unless($teacher?->isTeacher(), 403, 'Only teacher accounts can access assigned timetables.');

        $timetables = Timetable::query()
            ->with(['creator:id,name', 'entries.subject:id,name,code'])
            ->where('assigned_teacher_id', $teacher->id)
            ->where('school_track', $teacher->school_track)
            ->where('class_name', $teacher->assigned_class_name)
            ->orderBy('class_name')
            ->get()
            ->map(fn (Timetable $timetable): array => $this->serializeTimetable(
                $timetable,
                $timetable->entries,
                'full_class',
            ));

        $teacherTrack = $teacher->school_track;
        $allTracks = SchoolContextOptions::tracks();
        $teacherTracks = ($teacherTrack && isset($allTracks[$teacherTrack]))
            ? [$teacherTrack => $allTracks[$teacherTrack]]
            : [];

        $allClasses = SchoolContextOptions::classesByTrack($teacher->school_id);
        $teacherClasses = ($teacherTrack && isset($allClasses[$teacherTrack]))
            ? [$teacherTrack => $allClasses[$teacherTrack]]
            : [];

        return response()->json([
            'timetables' => $timetables->values(),
            'daysOfWeek' => TimetableOptions::daysOfWeek(),
            'options' => [
                'schoolTracks' => $teacherTracks,
                'classesByTrack' => $teacherClasses,
                'subjectsByTrack' => [
                    $teacherTrack => SchoolSubject::query()
                        ->where('school_id', $teacher->school_id)
                        ->where('school_track', $teacherTrack)
                        ->orderBy('name')
                        ->get(['id', 'name', 'code'])
                        ->map(fn (SchoolSubject $subject): array => [
                            'id' => $subject->id,
                            'name' => $subject->name,
                            'code' => $subject->code,
                        ])->values()->all(),
                ],
                'teachersByTrack' => $teacherTrack ? [
                    $teacherTrack => [
                        [
                            'id' => $teacher->id,
                            'name' => $teacher->name,
                            'assigned_class_name' => $teacher->assigned_class_name,
                            'school_track' => $teacherTrack,
                            'teaching_roles' => ['class_teacher'],
                        ],
                    ],
                ] : [],
                'daysOfWeek' => TimetableOptions::daysOfWeek(),
            ],
        ]);
    }

    public function store(StoreTeacherTimetableRequest $request): JsonResponse
    {
        $teacher = $request->user();
        $validated = $request->validated();
        $this->guardTeacherScope($teacher, $validated);

        $timetable = Timetable::query()->create([
            'title' => $validated['title'],
            'school_track' => $teacher->school_track,
            'class_name' => $teacher->assigned_class_name,
            'assigned_teacher_id' => $teacher->id,
            'created_by' => $teacher->id,
            'notes' => $validated['notes'] ?? null,
            'status' => 'draft',
        ]);
        $timetable->entries()->createMany($validated['entries']);

        return response()->json([
            'message' => 'Timetable draft saved successfully.',
            'timetable' => $this->serializeTimetable($timetable->fresh(['creator:id,name', 'entries.subject:id,name,code']), $timetable->entries, 'full_class'),
        ], 201);
    }

    public function update(UpdateTeacherTimetableRequest $request, Timetable $timetable): JsonResponse
    {
        $teacher = $request->user();
        abort_unless($this->teacherOwnsTimetable($teacher, $timetable), 404);
        abort_if($timetable->status === 'submitted', 409, 'This timetable has already been submitted to the head teacher.');

        $validated = $request->validated();
        $this->guardTeacherScope($teacher, $validated);
        $timetable->update(['title' => $validated['title'], 'notes' => $validated['notes'] ?? null]);
        $timetable->entries()->delete();
        $timetable->entries()->createMany($validated['entries']);

        return response()->json(['message' => 'Timetable draft updated successfully.']);
    }

    public function destroy(Request $request, Timetable $timetable): JsonResponse
    {
        $teacher = $request->user();
        abort_unless($this->teacherOwnsTimetable($teacher, $timetable), 404);
        abort_if($timetable->status === 'submitted', 409, 'Submitted timetables cannot be deleted.');
        $timetable->delete();

        return response()->json(['message' => 'Timetable draft deleted successfully.']);
    }

    public function submit(Request $request, Timetable $timetable): JsonResponse
    {
        $teacher = $request->user();
        abort_unless($this->teacherOwnsTimetable($teacher, $timetable), 404);
        $timetable->update(['status' => 'submitted', 'submitted_at' => now()]);

        return response()->json(['message' => 'Timetable submitted to the head teacher successfully.']);
    }

    private function teacherOwnsTimetable($teacher, Timetable $timetable): bool
    {
        return $teacher?->isTeacher()
            && (int) $timetable->assigned_teacher_id === (int) $teacher->id
            && $timetable->school_track === $teacher->school_track
            && $timetable->class_name === $teacher->assigned_class_name;
    }

    private function guardTeacherScope($teacher, array $validated): void
    {
        abort_unless(
            filled($teacher?->school_track)
                && filled($teacher?->assigned_class_name)
                && $validated['school_track'] === $teacher->school_track
                && $validated['class_name'] === $teacher->assigned_class_name,
            422,
            'This timetable must belong to your assigned class.',
        );
    }

    /**
     * @return Collection<int, array<string, mixed>>
     */
    private function primaryTimetables(int $teacherId): Collection
    {
        return Timetable::query()
            ->with(['creator:id,name', 'entries.subject:id,name,code'])
            ->where('assigned_teacher_id', $teacherId)
            ->orderBy('school_track')
            ->orderBy('class_name')
            ->get()
            ->map(fn (Timetable $timetable): array => $this->serializeTimetable(
                $timetable,
                $timetable->entries,
                'full_class',
            ));
    }

    /**
     * @return Collection<int, array<string, mixed>>
     */
    private function secondaryTimetables(int $teacherId, ?string $formClassName): Collection
    {
        $subjectAssignments = TeacherSubjectAssignment::query()
            ->with('subject:id,name,code')
            ->where('teacher_id', $teacherId)
            ->where('school_track', 'secondary')
            ->get();

        $assignmentSubjectIdsByClass = $subjectAssignments
            ->groupBy('class_name')
            ->map(fn (Collection $items): array => $items
                ->pluck('subject_id')
                ->map(fn (mixed $value): int => (int) $value)
                ->unique()
                ->values()
                ->all());

        $visibleClasses = collect([$formClassName])
            ->filter()
            ->merge($assignmentSubjectIdsByClass->keys())
            ->unique()
            ->values();

        if ($visibleClasses->isEmpty()) {
            return collect();
        }

        return Timetable::query()
            ->with(['creator:id,name', 'entries.subject:id,name,code'])
            ->where('school_track', 'secondary')
            ->whereIn('class_name', $visibleClasses)
            ->orderBy('class_name')
            ->get()
            ->map(function (Timetable $timetable) use ($assignmentSubjectIdsByClass, $formClassName, $subjectAssignments): ?array {
                if ($formClassName !== null && $timetable->class_name === $formClassName) {
                    return $this->serializeTimetable(
                        $timetable,
                        $timetable->entries,
                        'form_class',
                    );
                }

                $subjectIds = $assignmentSubjectIdsByClass->get($timetable->class_name, []);
                $filteredEntries = $timetable->entries
                    ->filter(fn (TimetableEntry $entry): bool => in_array($entry->subject_id, $subjectIds, true))
                    ->values();

                if ($filteredEntries->isEmpty()) {
                    return null;
                }

                $subjectNames = $subjectAssignments
                    ->where('class_name', $timetable->class_name)
                    ->pluck('subject.name')
                    ->filter()
                    ->values()
                    ->all();

                return $this->serializeTimetable(
                    $timetable,
                    $filteredEntries,
                    'subject_periods',
                    $subjectNames,
                );
            })
            ->filter()
            ->values();
    }

    /**
     * @param  Collection<int, TimetableEntry>  $entries
     * @param  list<string>  $subjectNames
     * @return array<string, mixed>
     */
    private function serializeTimetable(
        Timetable $timetable,
        Collection $entries,
        string $viewScope,
        array $subjectNames = [],
    ): array {
        return [
            'id' => $timetable->id,
            'title' => $timetable->title,
            'school_track' => $timetable->school_track,
            'school_track_label' => SchoolContextOptions::tracks()[$timetable->school_track] ?? ucfirst($timetable->school_track),
            'class_name' => $timetable->class_name,
            'notes' => $timetable->notes,
            'status' => $timetable->status,
            'submitted_at' => $timetable->submitted_at?->toIso8601String(),
            'creator_name' => $timetable->creator?->name,
            'view_scope' => $viewScope,
            'view_scope_label' => match ($viewScope) {
                'form_class', 'full_class' => 'Full class timetable',
                default => 'Assigned subject periods',
            },
            'teacher_subject_names' => $subjectNames,
            'entry_count' => $entries->count(),
            'entries' => $entries->map(fn (TimetableEntry $entry): array => [
                'id' => $entry->id,
                'day_of_week' => $entry->day_of_week,
                'day_of_week_label' => TimetableOptions::daysOfWeek()[$entry->day_of_week] ?? ucfirst($entry->day_of_week),
                'period_label' => $entry->period_label,
                'start_time' => $entry->start_time?->format('H:i'),
                'end_time' => $entry->end_time?->format('H:i'),
                'is_break' => (bool) $entry->is_break,
                'room' => $entry->room,
                'notes' => $entry->notes,
                'subject' => $entry->subject ? [
                    'id' => $entry->subject->id,
                    'name' => $entry->subject->name,
                    'code' => $entry->subject->code,
                ] : null,
            ])->values(),
        ];
    }
}
