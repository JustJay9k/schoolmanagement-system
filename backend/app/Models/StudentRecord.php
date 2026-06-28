<?php

namespace App\Models;

use Carbon\Carbon;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class StudentRecord extends Model
{
    protected $fillable = [
        'school_id',
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
        'fees_balance',
        'books_paid',
        'uniform_paid',
        'created_by',
    ];

    protected function casts(): array
    {
        return [
            'date_of_birth' => 'date',
            'first_entry_date' => 'date',
            'fees_balance' => 'decimal:2',
            'books_paid' => 'boolean',
            'uniform_paid' => 'boolean',
        ];
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function school(): BelongsTo
    {
        return $this->belongsTo(School::class);
    }

    public function performanceRecords(): HasMany
    {
        return $this->hasMany(StudentPerformanceRecord::class)->latest();
    }

    public function guardians(): HasMany
    {
        return $this->hasMany(User::class, 'linked_student_record_id');
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
