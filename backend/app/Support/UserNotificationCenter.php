<?php

namespace App\Support;

use App\Models\User;
use App\Models\UserNotification;

final class UserNotificationCenter
{
    public static function createForUser(
        User $user,
        string $title,
        string $message,
        string $level = 'info',
        ?string $actionUrl = null,
        ?int $announcementId = null,
    ): UserNotification {
        return UserNotification::query()->create([
            'user_id' => $user->id,
            'announcement_id' => $announcementId,
            'title' => $title,
            'message' => $message,
            'level' => $level,
            'action_url' => $actionUrl,
        ]);
    }

    public static function welcome(User $user): UserNotification
    {
        return self::createForUser(
            $user,
            'Welcome to PCMS',
            'Your account is ready. Review your assigned school and workspace modules, then continue from your dashboard.',
            'success',
            '/dashboard',
        );
    }
}
