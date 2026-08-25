<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable(['homework_id', 'student_record_id', 'teacher_id', 'grade', 'remarks'])]
class HomeworkGrade extends Model
{
    public function homework(): BelongsTo
    {
        return $this->belongsTo(Homework::class);
    }

    public function student(): BelongsTo
    {
        return $this->belongsTo(StudentRecord::class, 'student_record_id');
    }

    public function teacher(): BelongsTo
    {
        return $this->belongsTo(User::class, 'teacher_id');
    }
}
