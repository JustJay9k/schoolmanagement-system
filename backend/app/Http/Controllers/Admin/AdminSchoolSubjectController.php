<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\StoreSchoolSubjectRequest;
use App\Http\Requests\Admin\UpdateSchoolSubjectRequest;
use App\Models\SchoolSubject;
use App\Support\SchoolContextOptions;
use Illuminate\Http\RedirectResponse;
use Illuminate\View\View;

class AdminSchoolSubjectController extends Controller
{
    public function index(): View
    {
        return view('admin.subjects.index', [
            'subjects' => SchoolSubject::query()
                ->orderBy('school_track')
                ->orderBy('name')
                ->get()
                ->groupBy('school_track'),
            'schoolTracks' => SchoolContextOptions::tracks(),
        ]);
    }

    public function store(StoreSchoolSubjectRequest $request): RedirectResponse
    {
        $validated = $request->validated();

        SchoolSubject::query()->create([
            'name' => $validated['name'],
            'code' => $validated['code'] ?: null,
            'school_track' => $validated['school_track'],
            'created_by' => $request->user()?->id,
        ]);

        return redirect()
            ->route('admin.subjects.index')
            ->with('status', 'Subject saved successfully.');
    }

    public function edit(SchoolSubject $subject): View
    {
        return view('admin.subjects.edit', [
            'subject' => $subject,
            'schoolTracks' => SchoolContextOptions::tracks(),
        ]);
    }

    public function update(UpdateSchoolSubjectRequest $request, SchoolSubject $subject): RedirectResponse
    {
        $validated = $request->validated();

        $subject->update([
            'name' => $validated['name'],
            'code' => $validated['code'] ?: null,
            'school_track' => $validated['school_track'],
        ]);

        return redirect()
            ->route('admin.subjects.index')
            ->with('status', 'Subject updated successfully.');
    }

    public function destroy(SchoolSubject $subject): RedirectResponse
    {
        if ($subject->timetableEntries()->exists()) {
            return back()->withErrors([
                'subject' => 'This subject is already used in a timetable. Remove or change those timetable entries first.',
            ]);
        }

        $subject->delete();

        return redirect()
            ->route('admin.subjects.index')
            ->with('status', 'Subject deleted successfully.');
    }
}
