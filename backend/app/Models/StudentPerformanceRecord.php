<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class StudentPerformanceRecord extends Model
{
    public const STATUS_DRAFT = 'draft';

    public const STATUS_SUBMITTED = 'submitted';

    public const STATUS_APPROVED = 'approved';

    protected $fillable = [
        'student_record_id',
        'teacher_id',
        'assessment_period_id',
        'grade',
        'subject_grades',
        'comment',
        'status',
    ];

    protected function casts(): array
    {
        return [
            'subject_grades' => 'array',
        ];
    }

    public function student(): BelongsTo
    {
        return $this->belongsTo(StudentRecord::class, 'student_record_id');
    }

    public function teacher(): BelongsTo
    {
        return $this->belongsTo(User::class, 'teacher_id');
    }

    public function assessmentPeriod(): BelongsTo
    {
        return $this->belongsTo(GradeAssessmentPeriod::class, 'assessment_period_id');
    }

    public function scopeSubmitted($query)
    {
        return $query->where('status', self::STATUS_SUBMITTED);
    }

    public function scopeDraft($query)
    {
        return $query->where('status', self::STATUS_DRAFT);
    }

    public function scopeApproved($query)
    {
        return $query->where('status', self::STATUS_APPROVED);
    }

    public function scopeVisibleToHeadTeacher($query)
    {
        return $query->whereIn('status', [
            self::STATUS_SUBMITTED,
            self::STATUS_APPROVED,
        ]);
    }

    public function scopeVisibleToGuardian($query)
    {
        return $query->where('status', self::STATUS_APPROVED);
    }
}
