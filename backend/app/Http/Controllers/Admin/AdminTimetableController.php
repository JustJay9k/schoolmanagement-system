<?php

namespace App\Http\Controllers\Admin;

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
use Illuminate\Http\RedirectResponse;
use Illuminate\View\View;

class AdminTimetableController extends Controller
{
    public function index(): View
    {
        return view('admin.timetables.index', [
            'timetables' => Timetable::query()
                ->with(['assignedTeacher', 'creator', 'entries.subject'])
                ->orderBy('school_track')
                ->orderBy('class_name')
                ->get(),
            'trackLabels' => SchoolContextOptions::tracks(),
        ]);
    }

    public function create(): View
    {
        return view('admin.timetables.create', $this->formData());
    }

    public function store(StoreTimetableRequest $request): RedirectResponse
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

        return redirect()
            ->route('admin.timetables.show', $timetable)
            ->with('status', 'Timetable created successfully.');
    }

    public function show(Timetable $timetable): View
    {
        $timetable->load(['assignedTeacher', 'creator', 'entries.subject']);

        return view('admin.timetables.show', [
            'timetable' => $timetable,
            'trackLabels' => SchoolContextOptions::tracks(),
            'daysOfWeek' => TimetableOptions::daysOfWeek(),
            'canManageTimetable' => true,
        ]);
    }

    public function edit(Timetable $timetable): View
    {
        $timetable->load('entries');

        return view('admin.timetables.edit', $this->formData($timetable));
    }

    public function update(UpdateTimetableRequest $request, Timetable $timetable): RedirectResponse
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

        return redirect()
            ->route('admin.timetables.show', $timetable)
            ->with('status', 'Timetable updated successfully.');
    }

    public function destroy(Timetable $timetable): RedirectResponse
    {
        $timetable->delete();

        return redirect()
            ->route('admin.timetables.index')
            ->with('status', 'Timetable deleted successfully.');
    }

    /**
     * @return array<string, mixed>
     */
    private function formData(?Timetable $timetable = null): array
    {
        $subjects = SchoolSubject::query()
            ->orderBy('school_track')
            ->orderBy('name')
            ->get();

        return [
            'timetable' => $timetable,
            'schoolTracks' => SchoolContextOptions::tracks(),
            'classesByTrack' => SchoolContextOptions::classesByTrack(),
            'subjectsByTrack' => $subjects
                ->groupBy('school_track')
                ->map(fn ($items) => $items->map(fn (SchoolSubject $subject): array => [
                    'id' => $subject->id,
                    'name' => $subject->name,
                    'code' => $subject->code,
                ])->values()->all())
                ->all(),
            'teachersByTrack' => User::query()
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
                ->all(),
            'daysOfWeek' => TimetableOptions::daysOfWeek(),
        ];
    }
}
