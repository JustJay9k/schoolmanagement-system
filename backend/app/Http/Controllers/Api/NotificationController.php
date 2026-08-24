<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AnnouncementAttachment;
use App\Models\UserNotification;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class NotificationController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();

        abort_unless($user, 401);

        $notifications = $user->notifications()
            ->with('announcement.attachments')
            ->latest('created_at')
            ->get()
            ->map(fn (UserNotification $notification): array => $this->serializeNotification($notification))
            ->values();

        $unreadCount = $user->notifications()->whereNull('read_at')->count();

        return response()->json([
            'notifications' => $notifications,
            'summary' => [
                'total' => $notifications->count(),
                'unread' => $unreadCount,
                'read' => max($notifications->count() - $unreadCount, 0),
            ],
        ]);
    }

    public function markAllRead(Request $request): JsonResponse
    {
        $user = $request->user();

        abort_unless($user, 401);

        $user->notifications()
            ->whereNull('read_at')
            ->update([
                'read_at' => now(),
                'updated_at' => now(),
            ]);

        return response()->json([
            'message' => 'All notifications marked as read.',
        ]);
    }

    public function markRead(Request $request, UserNotification $notification): JsonResponse
    {
        $user = $request->user();

        abort_unless($user, 401);
        abort_unless((int) $notification->user_id === (int) $user->id, 404);

        if (! $notification->read_at) {
            $notification->forceFill([
                'read_at' => now(),
            ])->save();
        }

        return response()->json([
            'message' => 'Notification marked as read.',
            'notification' => $this->serializeNotification(
                $notification->fresh()->loadMissing('announcement.attachments'),
            ),
        ]);
    }

    /**
     * @return array<string, mixed>
     */
    private function serializeNotification(UserNotification $notification): array
    {
        return [
            'id' => $notification->id,
            'title' => $notification->title,
            'message' => $notification->message,
            'level' => $notification->level,
            'action_url' => $notification->action_url,
            'attachments' => $notification->announcement?->attachments
                ->map(fn (AnnouncementAttachment $attachment): array => [
                    'id' => $attachment->id,
                    'name' => $attachment->original_name,
                    'url' => $attachment->download_url,
                    'mime_type' => $attachment->mime_type,
                    'size_in_kb' => (int) $attachment->size_in_kb,
                    'is_image' => (bool) $attachment->is_image,
                ])
                ->values()
                ->all() ?? [],
            'read_at' => $notification->read_at?->toIso8601String(),
            'created_at' => $notification->created_at?->toIso8601String(),
        ];
    }
}
