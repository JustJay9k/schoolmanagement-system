<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Facades\URL;

#[Fillable(['submission_id', 'file_path', 'original_name', 'mime_type', 'size_in_kb', 'is_image'])]
class HomeworkSubmissionAttachment extends Model
{
    protected $table = 'homework_submission_attachments';

    protected function casts(): array
    {
        return [
            'is_image' => 'boolean',
        ];
    }

    public function submission(): BelongsTo
    {
        return $this->belongsTo(HomeworkSubmission::class, 'submission_id');
    }

    public function getDownloadUrlAttribute(): string
    {
        return URL::temporarySignedRoute(
            'homework.submissions.file',
            now()->addHours(12),
            ['attachment' => $this->getKey()],
        );
    }
}
