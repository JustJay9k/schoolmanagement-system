<?php

namespace App\Http\Controllers\Api\Management;

use App\Enums\UserRole;
use App\Enums\UserStatus;
use App\Http\Controllers\Controller;
use App\Models\RegisterReport;
use App\Models\StudentRecord;
use App\Models\User;
use App\Support\SchoolContextOptions;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ManagementDashboardApiController extends Controller
{
    public function show(Request $request): JsonResponse
    {
        $school = $request->user()?->school;

        if (! $school) {
            return response()->json([
                'school' => null,
                'summary' => $this->emptySummary(),
                'requiresSchoolAssignment' => true,
            ]);
        }

        $schoolId = $school->id;
        $students = StudentRecord::query()
            ->where('school_id', $schoolId)
            ->get(['id', 'school_track', 'class_name']);
        $teachers = User::query()
            ->where('role', UserRole::Teacher)
            ->where('school_id', $schoolId)
            ->get(['id', 'status', 'school_track', 'assigned_class_name']);
        $classesByTrack = SchoolContextOptions::classesByTrack($schoolId);
        $configuredClassCount = collect($classesByTrack)->flatten()->count();
        $assignedClassCount = $teachers
            ->filter(fn (User $teacher): bool => filled($teacher->assigned_class_name))
            ->map(fn (User $teacher): string => $teacher->school_track.'::'.$teacher->assigned_class_name)
            ->unique()
            ->count();

        return response()->json([
            'school' => [
                'id' => $school->id,
                'name' => $school->name,
            ],
            'summary' => [
                'students' => [
                    'total' => $students->count(),
                    'primary' => $students->where('school_track', 'primary')->count(),
                    'secondary' => $students->where('school_track', 'secondary')->count(),
                ],
                'teachers' => [
                    'total' => $teachers->count(),
                    'active' => $teachers->where('status', UserStatus::Active)->count(),
                    'primary' => $teachers->where('school_track', 'primary')->count(),
                    'secondary' => $teachers->where('school_track', 'secondary')->count(),
                ],
                'classes' => [
                    'configured' => $configuredClassCount,
                    'primary' => count($classesByTrack['primary'] ?? []),
                    'secondary' => count($classesByTrack['secondary'] ?? []),
                    'with_assigned_teacher' => $assignedClassCount,
                    'without_assigned_teacher' => max($configuredClassCount - $assignedClassCount, 0),
                ],
                'registers' => [
                    'submitted_today' => RegisterReport::query()
                        ->where('school_id', $schoolId)
                        ->whereDate('report_date', today())
                        ->where('status', 'submitted')
                        ->count(),
                ],
            ],
            'requiresSchoolAssignment' => false,
        ]);
    }

    /**
     * @return array<string, mixed>
     */
    private function emptySummary(): array
    {
        return [
            'students' => [
                'total' => 0,
                'primary' => 0,
                'secondary' => 0,
            ],
            'teachers' => [
                'total' => 0,
                'active' => 0,
                'primary' => 0,
                'secondary' => 0,
            ],
            'classes' => [
                'configured' => 0,
                'primary' => 0,
                'secondary' => 0,
                'with_assigned_teacher' => 0,
                'without_assigned_teacher' => 0,
            ],
            'registers' => [
                'submitted_today' => 0,
            ],
        ];
    }
}
