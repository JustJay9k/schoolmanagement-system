<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class StudentPerformanceRecord extends Model
{
    protected $fillable = [
        'student_record_id',
        'teacher_id',
        'assessment_period_id',
        'grade',
        'subject_grades',
        'comment',
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
}
