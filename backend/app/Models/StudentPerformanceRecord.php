<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class StudentPerformanceRecord extends Model
{
    public const STATUS_DRAFT = 'draft';

    public const STATUS_SUBMITTED = 'submitted';

    public const STATUS_APPROVED = 'approved';

    public const TERM_FIRST = 'first';

    public const TERM_SECOND = 'second';

    public const TERM_THIRD = 'third';

    public const TERMS = [
        self::TERM_FIRST => 'First Term',
        self::TERM_SECOND => 'Second Term',
        self::TERM_THIRD => 'Third Term',
    ];

    protected $fillable = [
        'student_record_id',
        'teacher_id',
        'assessment_period_id',
        'term',
        'grade',
        'subject_grades',
        'comment',
        'status',
    ];

    /**
     * @return array<string, string>
     */
    public static function termLabels(): array
    {
        return self::TERMS;
    }

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
