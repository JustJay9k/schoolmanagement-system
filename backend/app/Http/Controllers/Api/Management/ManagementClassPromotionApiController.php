<?php

namespace App\Http\Controllers\Api\Management;

use App\Http\Controllers\Controller;
use App\Models\ClassPromotion;
use App\Models\StudentRecord;
use App\Models\User;
use App\Support\SchoolContextOptions;
use App\Support\UserNotificationCenter;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ManagementClassPromotionApiController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $actor = $request->user();

        abort_unless($actor && $actor->canManageTimetables(), 403);

        $promotions = ClassPromotion::query()
            ->where('school_id', $actor->school_id)
            ->orderByRaw("CASE WHEN status = 'pending' THEN 0 ELSE 1 END")
            ->latest('submitted_at')
            ->get()
            ->map(fn (ClassPromotion $promotion): array => $this->serialize($promotion, $actor))
            ->values();

        return response()->json([
            'promotions' => $promotions,
        ]);
    }

    public function approve(Request $request, ClassPromotion $promotion): JsonResponse
    {
        $actor = $request->user();

        abort_unless($actor && $actor->canManageTimetables(), 403);

        if ($promotion->school_id !== $actor->school_id) {
            abort(404);
        }

        if (! $promotion->isPending()) {
            return response()->json([
                'message' => 'This promotion request has already been processed.',
            ], 422);
        }

        $snapshotStudentIds = collect($promotion->students ?? [])
            ->map(fn (array $entry): int => (int) ($entry['student_id'] ?? 0))
            ->filter(fn (int $id): bool => $id > 0)
            ->values();

        $requestedStudentIds = collect($request->input('student_ids', []))
            ->map(fn ($value): int => (int) $value)
            ->filter(fn (int $id): bool => $id > 0)
            ->unique()
            ->values();

        $candidateIds = $requestedStudentIds->isEmpty()
            ? $snapshotStudentIds
            : $requestedStudentIds->intersect($snapshotStudentIds);

        $studentsToPromote = StudentRecord::query()
            ->where('school_id', $actor->school_id)
            ->where('school_track', $promotion->school_track)
            ->where('class_name', $promotion->from_class)
            ->whereIn('id', $candidateIds)
            ->get(['id', 'full_name']);

        if ($studentsToPromote->isEmpty()) {
            return response()->json([
                'message' => 'Select at least one learner from the submitted list to promote.',
            ], 422);
        }

        $movingIds = $studentsToPromote->pluck('id');

        StudentRecord::query()
            ->whereIn('id', $movingIds)
            ->update(['class_name' => $promotion->to_class]);

        $promotion->update([
            'status' => ClassPromotion::STATUS_APPROVED,
            'approved_student_ids' => $movingIds->values()->all(),
            'approved_at' => now(),
            'approved_by' => $actor->id,
        ]);

        $this->notifyGuardians($studentsToPromote, $promotion);

        UserNotificationCenter::createForUser(
            User::query()->findOrFail($promotion->teacher_id),
            'Promotion approved',
            "The head teacher approved {$studentsToPromote->count()} learner(s) from {$promotion->from_class}. They have been moved to {$promotion->to_class}.",
            'success',
            '/gradebook',
        );

        return response()->json([
            'message' => "{$studentsToPromote->count()} learner(s) from {$promotion->from_class} promoted to {$promotion->to_class}. All their records follow them to the new class.",
            'promotion' => $this->serialize($promotion->fresh(), $actor),
        ]);
    }

    public function reject(Request $request, ClassPromotion $promotion): JsonResponse
    {
        $actor = $request->user();

        abort_unless($actor && $actor->canManageTimetables(), 403);

        if ($promotion->school_id !== $actor->school_id) {
            abort(404);
        }

        if (! $promotion->isPending()) {
            return response()->json([
                'message' => 'This promotion request has already been processed.',
            ], 422);
        }

        $promotion->update([
            'status' => ClassPromotion::STATUS_REJECTED,
            'approved_at' => now(),
            'approved_by' => $actor->id,
        ]);

        UserNotificationCenter::createForUser(
            User::query()->findOrFail($promotion->teacher_id),
            'Promotion request rejected',
            "The head teacher rejected the promotion request from {$promotion->from_class} to {$promotion->to_class}. Review the learners or submit a new request.",
            'error',
            '/gradebook',
        );

        return response()->json([
            'message' => "The promotion request from {$promotion->from_class} was rejected. No learners were moved.",
            'promotion' => $this->serialize($promotion->fresh(), $actor),
        ]);
    }

    private function notifyGuardians($studentsToPromote, ClassPromotion $promotion): void
    {
        $studentsToPromote->loadMissing('guardians');

        foreach ($studentsToPromote as $student) {
            foreach ($student->guardians as $guardian) {
                UserNotificationCenter::createForUser(
                    $guardian,
                    'Class promotion approved',
                    "Your ward {$student->full_name} has been promoted from {$promotion->from_class} to {$promotion->to_class}.",
                    'info',
                    '/dashboard',
                );
            }
        }
    }

    /**
     * @return array<string, mixed>
     */
    private function serialize(ClassPromotion $promotion, User $actor): array
    {
        $teacher = $promotion->teacher;

        return [
            'id' => $promotion->id,
            'school_track' => $promotion->school_track,
            'school_track_label' => SchoolContextOptions::tracks()[$promotion->school_track] ?? ucfirst($promotion->school_track),
            'from_class' => $promotion->from_class,
            'to_class' => $promotion->to_class,
            'status' => $promotion->status,
            'teacher_name' => $promotion->teacher_name,
            'teacher_id' => $promotion->teacher_id,
            'school_id' => $promotion->school_id,
            'students' => $promotion->students ?? [],
            'approved_student_ids' => $promotion->approved_student_ids ?? [],
            'submitted_at' => $promotion->submitted_at?->toIso8601String(),
            'approved_at' => $promotion->approved_at?->toIso8601String(),
            'approved_by_name' => $promotion->approver?->name ?? null,
            'teacher_name_fallback' => $teacher?->name ?? $promotion->teacher_name,
        ];
    }
}