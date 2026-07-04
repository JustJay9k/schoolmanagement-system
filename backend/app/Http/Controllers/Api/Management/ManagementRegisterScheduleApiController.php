<?php

namespace App\Http\Controllers\Api\Management;

use App\Http\Controllers\Controller;
use App\Http\Requests\Management\UpdateRegisterScheduleRequest;
use App\Support\SchoolContextOptions;
use Illuminate\Http\JsonResponse;

class ManagementRegisterScheduleApiController extends Controller
{
    public function show(): JsonResponse
    {
        return response()->json([
            'scheduleByTrack' => SchoolContextOptions::registerScheduleByTrack(),
            'defaultScheduleByTrack' => SchoolContextOptions::defaultRegisterScheduleByTrack(),
        ]);
    }

    public function update(UpdateRegisterScheduleRequest $request): JsonResponse
    {
        SchoolContextOptions::saveRegisterScheduleByTrack(
            $request->input('schedule_by_track', []),
        );

        return response()->json([
            'message' => 'Register schedule updated successfully.',
            'scheduleByTrack' => SchoolContextOptions::registerScheduleByTrack(),
        ]);
    }
}
