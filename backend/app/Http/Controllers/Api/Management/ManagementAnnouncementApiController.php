<?php

namespace App\Http\Controllers\Api\Management;

use App\Http\Controllers\Controller;
use App\Http\Requests\Management\StoreAnnouncementRequest;
use App\Models\Announcement;
use App\Models\AnnouncementAttachment;
use App\Models\User;
use App\Enums\UserRole;
use App\Enums\UserStatus;
use App\Support\UserNotificationCenter;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class ManagementAnnouncementApiController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();
        abort_unless($user, 401);

        if (! filled($user->school_id)) {
            return response()->json([
                'announcements' => [],
                'requiresSchoolAssignment' => true,
            ]);
        }

        $announcements = Announcement::query()
            ->where('school_id', $user->school_id)
            ->with(['author:id,name', 'attachments'])
            ->withCount('notifications')
            ->latest()
            ->get();

        return response()->json([
            'announcements' => $announcements
                ->map(fn (Announcement $announcement): array => $this->serializeAnnouncement($announcement))
                ->values(),
        ]);
    }

    public function store(StoreAnnouncementRequest $request): JsonResponse
    {
        $user = $request->user();

        abort_unless(filled($user?->school_id), 422, 'Your account is not assigned to a school yet.');

        $validated = $request->validated();

        $announcement = Announcement::query()->create([
            'school_id' => $user->school_id,
            'author_id' => $user->id,
            'title' => $validated['title'],
            'body' => $validated['body'] ?? null,
        ]);

        foreach ($request->file('attachments', []) as $uploadedFile) {
            $path = $uploadedFile->store('announcement-attachments', 'public');
            $mimeType = (string) $uploadedFile->getClientMimeType();

            AnnouncementAttachment::query()->create([
                'announcement_id' => $announcement->id,
                'file_path' => $path,
                'original_name' => $uploadedFile->getClientOriginalName(),
                'mime_type' => $mimeType,
                'size_in_kb' => max(1, (int) ceil($uploadedFile->getSize() / 1024)),
                'is_image' => str_starts_with($mimeType, 'image/'),
            ]);
        }

        $message = filled(trim((string) ($validated['body'] ?? '')))
            ? trim((string) $validated['body'])
            : 'The head teacher shared this announcement with your school. Open it to view the attached files.';

        User::query()
            ->where('role', UserRole::Guardian)
            ->where('school_id', $user->school_id)
            ->where('status', UserStatus::Active)
            ->get()
            ->each(
                fn (User $guardian): mixed => UserNotificationCenter::createForUser(
                    $guardian,
                    $validated['title'],
                    $message,
                    'info',
                    '/notifications',
                    $announcement->id,
                ),
            );

        return response()->json([
            'message' => 'Announcement published to the guardians of your school.',
            'announcement' => $this->serializeAnnouncement($announcement->fresh(['author:id,name', 'attachments'])->loadCount('notifications')),
        ], 201);
    }

    public function destroy(Request $request, Announcement $announcement): JsonResponse
    {
        abort_unless($request->user(), 401);
        $this->abortIfOutsideSchoolScope($request, $announcement);

        foreach ($announcement->attachments as $attachment) {
            $this->deleteFile($attachment->file_path);
        }

        $announcement->delete();

        return response()->json([
            'message' => 'Announcement removed successfully.',
        ]);
    }

    private function abortIfOutsideSchoolScope(Request $request, Announcement $announcement): void
    {
        if ($announcement->school_id !== $request->user()?->school_id) {
            abort(404);
        }
    }

    private function deleteFile(?string $path): void
    {
        if (! is_string($path) || $path === '') {
            return;
        }

        Storage::disk('public')->delete($path);
    }

    /**
     * @return array<string, mixed>
     */
    private function serializeAnnouncement(Announcement $announcement): array
    {
        return [
            'id' => $announcement->id,
            'title' => $announcement->title,
            'body' => $announcement->body,
            'author_name' => $announcement->author?->name,
            'recipients_count' => (int) ($announcement->notifications_count ?? $announcement->notifications()->count()),
            'attachments' => $announcement->attachments
                ->map(fn (AnnouncementAttachment $attachment): array => $this->serializeAttachment($attachment))
                ->values(),
            'created_at' => $announcement->created_at?->toIso8601String(),
            'updated_at' => $announcement->updated_at?->toIso8601String(),
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function serializeAttachment(AnnouncementAttachment $attachment): array
    {
        return [
            'id' => $attachment->id,
            'name' => $attachment->original_name,
            'url' => $attachment->file_url,
            'mime_type' => $attachment->mime_type,
            'size_in_kb' => (int) $attachment->size_in_kb,
            'is_image' => (bool) $attachment->is_image,
        ];
    }
}
