<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\URL;

#[Fillable(['announcement_id', 'file_path', 'original_name', 'mime_type', 'size_in_kb', 'is_image'])]
class AnnouncementAttachment extends Model
{
    protected function casts(): array
    {
        return [
            'is_image' => 'boolean',
        ];
    }

    public function announcement(): BelongsTo
    {
        return $this->belongsTo(Announcement::class);
    }

    /**
     * Expiring signed URL served by the API itself. Built from the incoming
     * request scheme/host so attachments keep working on any host (shared
     * hosting, HTTPS, sub-folders) without depending on APP_URL or the
     * storage symlink.
     */
    public function getDownloadUrlAttribute(): ?string
    {
        if (! filled($this->file_path)) {
            return null;
        }

        return URL::temporarySignedRoute(
            'announcements.attachments.file',
            now()->addHours(12),
            ['attachment' => $this->id],
        );
    }
}
