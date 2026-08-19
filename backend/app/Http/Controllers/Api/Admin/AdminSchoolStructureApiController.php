<?php

namespace App\Http\Controllers\Api\Admin;

use App\Enums\UserRole;
use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\UpdateSchoolStructureRequest;
use App\Models\User;
use App\Support\SchoolContextOptions;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AdminSchoolStructureApiController extends Controller
{
    public function show(Request $request): JsonResponse
    {
        abort_unless(
            $request->user()?->canManageSchoolStructure(),
            403,
            'You do not have permission to manage the school structure.',
        );

        return response()->json([
            'classesByTrack' => SchoolContextOptions::classesByTrack(),
            'defaultClassesByTrack' => SchoolContextOptions::defaultClassesByTrack(),
            'teacherCountsByTrack' => [
                'primary' => User::query()->where('role', UserRole::Teacher)->where('school_track', 'primary')->count(),
                'secondary' => User::query()->where('role', UserRole::Teacher)->where('school_track', 'secondary')->count(),
            ],
        ]);
    }

    public function update(UpdateSchoolStructureRequest $request): JsonResponse
    {
        SchoolContextOptions::saveClassesByTrack($request->input('classes_by_track', []));

        return response()->json([
            'message' => 'School structure updated successfully.',
            'classesByTrack' => SchoolContextOptions::classesByTrack(),
        ]);
    }
}
