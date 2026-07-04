<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable([
    'school_id',
    'teacher_id',
    'teacher_name',
    'school_track',
    'class_name',
    'report_date',
    'status',
    'submitted_at',
    'periods',
    'entries',
    'summary',
])]
class RegisterReport extends Model
{
    use HasFactory;

    protected function casts(): array
    {
        return [
            'report_date' => 'date',
            'submitted_at' => 'datetime',
            'periods' => 'array',
            'entries' => 'array',
            'summary' => 'array',
        ];
    }

    public function school(): BelongsTo
    {
        return $this->belongsTo(School::class);
    }

    public function teacher(): BelongsTo
    {
        return $this->belongsTo(User::class, 'teacher_id');
    }

    public function isSubmitted(): bool
    {
        return $this->status === 'submitted';
    }
}
