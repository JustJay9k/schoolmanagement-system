<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable(['homework_id', 'position', 'question_text'])]
class HomeworkQuestion extends Model
{
    public function homework(): BelongsTo
    {
        return $this->belongsTo(Homework::class);
    }
}
