<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class StudentPerformanceRecord extends Model
{
    protected $fillable = [
        'student_record_id',
        'teacher_id',
        'grade',
        'comment',
    ];

    public function student(): BelongsTo
    {
        return $this->belongsTo(StudentRecord::class, 'student_record_id');
    }

    public function teacher(): BelongsTo
    {
        return $this->belongsTo(User::class, 'teacher_id');
    }
}
