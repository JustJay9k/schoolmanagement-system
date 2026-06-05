<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\UpdateSchoolStructureRequest;
use App\Support\SchoolContextOptions;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\View\View;

class AdminSchoolStructureController extends Controller
{
    public function edit(): View
    {
        $classesByTrack = SchoolContextOptions::classesByTrack();

        return view('admin.school-structure.edit', [
            'classesByTrack' => $classesByTrack,
            'defaultClassesByTrack' => SchoolContextOptions::defaultClassesByTrack(),
            'teacherCountsByTrack' => [
                'primary' => User::query()->where('role', 'teacher')->where('school_track', 'primary')->count(),
                'secondary' => User::query()->where('role', 'teacher')->where('school_track', 'secondary')->count(),
            ],
        ]);
    }

    public function update(UpdateSchoolStructureRequest $request): RedirectResponse
    {
        SchoolContextOptions::saveClassesByTrack($request->input('classes_by_track', []));

        return redirect()
            ->route('admin.school-structure.edit')
            ->with('status', 'School structure updated successfully.');
    }
}
