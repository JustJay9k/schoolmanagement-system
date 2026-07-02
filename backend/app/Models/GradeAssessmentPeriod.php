<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class GradeAssessmentPeriod extends Model
{
    protected $fillable = [
        'school_id',
        'name',
        'position',
        'created_by',
    ];

    public function school(): BelongsTo
    {
        return $this->belongsTo(School::class);
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function performanceRecords(): HasMany
    {
        return $this->hasMany(StudentPerformanceRecord::class, 'assessment_period_id');
    }
}
