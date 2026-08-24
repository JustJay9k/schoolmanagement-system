<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Facades\Storage;

#[Fillable(['announcement_id', 'file_path', 'original_name', 'mime_type', 'size_in_kb', 'is_image'])]
class AnnouncementAttachment extends Model
{
    protected $appends = [
        'file_url',
    ];

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

    public function getFileUrlAttribute(): ?string
    {
        if (! filled($this->file_path)) {
            return null;
        }

        return Storage::disk('public')->url($this->file_path);
    }
}
