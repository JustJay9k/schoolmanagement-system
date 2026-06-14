<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Timetable;
use App\Support\SchoolContextOptions;
use App\Support\TimetableOptions;
use Illuminate\Http\Request;
use Illuminate\View\View;

class TeacherTimetableController extends Controller
{
    public function index(Request $request): View
    {
        abort_unless($request->user()?->isTeacher(), 403);

        $timetables = Timetable::query()
            ->with(['creator', 'entries.subject'])
            ->where('assigned_teacher_id', $request->user()?->id)
            ->orderBy('school_track')
            ->orderBy('class_name')
            ->get();

        return view('admin.timetables.teacher-index', [
            'timetables' => $timetables,
            'trackLabels' => SchoolContextOptions::tracks(),
        ]);
    }

    public function show(Request $request, Timetable $timetable): View
    {
        abort_unless($request->user()?->isTeacher(), 403);
        abort_unless($timetable->assigned_teacher_id === $request->user()?->id, 403);

        $timetable->load(['assignedTeacher', 'creator', 'entries.subject']);

        return view('admin.timetables.show', [
            'timetable' => $timetable,
            'trackLabels' => SchoolContextOptions::tracks(),
            'daysOfWeek' => TimetableOptions::daysOfWeek(),
            'canManageTimetable' => false,
        ]);
    }
}
