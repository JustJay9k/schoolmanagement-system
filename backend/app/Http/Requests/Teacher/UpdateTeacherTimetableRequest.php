<?php

namespace App\Http\Requests\Teacher;

use App\Http\Requests\Admin\UpdateTimetableRequest;

class UpdateTeacherTimetableRequest extends UpdateTimetableRequest
{
    public function authorize(): bool
    {
        return $this->user()?->isTeacher() && $this->user()?->isActive();
    }
}
