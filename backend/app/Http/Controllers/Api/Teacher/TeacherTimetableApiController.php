<?php

namespace App\Http\Controllers\Api\Teacher;

use App\Http\Controllers\Controller;
use App\Models\Timetable;
use App\Support\SchoolContextOptions;
use App\Support\TimetableOptions;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class TeacherTimetableApiController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        abort_unless($request->user()?->isTeacher(), 403, 'Only teacher accounts can access assigned timetables.');

        $timetables = Timetable::query()
            ->with(['creator:id,name', 'entries.subject:id,name,code'])
            ->where('assigned_teacher_id', $request->user()?->id)
            ->orderBy('school_track')
            ->orderBy('class_name')
            ->get();

        return response()->json([
            'timetables' => $timetables->map(fn (Timetable $timetable): array => [
                'id' => $timetable->id,
                'title' => $timetable->title,
                'school_track' => $timetable->school_track,
                'school_track_label' => SchoolContextOptions::tracks()[$timetable->school_track] ?? ucfirst($timetable->school_track),
                'class_name' => $timetable->class_name,
                'notes' => $timetable->notes,
                'creator_name' => $timetable->creator?->name,
                'entry_count' => $timetable->entries->count(),
                'entries' => $timetable->entries->map(fn ($entry): array => [
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
            ])->values(),
            'daysOfWeek' => TimetableOptions::daysOfWeek(),
        ]);
    }
}
