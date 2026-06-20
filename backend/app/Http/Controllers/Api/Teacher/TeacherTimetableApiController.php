<?php

namespace App\Http\Controllers\Api\Teacher;

use App\Http\Controllers\Controller;
use App\Models\TeacherSubjectAssignment;
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

        $timetables = $teacher->school_track === 'secondary'
            ? $this->secondaryTimetables($teacher->id, $teacher->assigned_class_name)
            : $this->primaryTimetables($teacher->id);

        return response()->json([
            'timetables' => $timetables->values(),
            'daysOfWeek' => TimetableOptions::daysOfWeek(),
        ]);
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
