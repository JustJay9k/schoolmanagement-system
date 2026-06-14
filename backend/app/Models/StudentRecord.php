<?php

namespace App\Models;

use Carbon\Carbon;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class StudentRecord extends Model
{
    protected $fillable = [
        'school_track',
        'class_name',
        'full_name',
        'sex',
        'date_of_birth',
        'age',
        'student_code',
        'orphan_status',
        'disability_name',
        'guardian_name',
        'residence',
        'first_entry_date',
        'created_by',
    ];

    protected function casts(): array
    {
        return [
            'date_of_birth' => 'date',
            'first_entry_date' => 'date',
        ];
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function resolvedAge(): ?int
    {
        if (is_int($this->age)) {
            return $this->age;
        }

        if (! $this->date_of_birth instanceof Carbon) {
            return null;
        }

        return $this->date_of_birth->age;
    }
}
