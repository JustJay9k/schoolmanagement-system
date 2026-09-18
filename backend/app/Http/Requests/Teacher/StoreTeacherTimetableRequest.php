<?php

namespace App\Http\Requests\Teacher;

use App\Http\Requests\Admin\StoreTimetableRequest;

class StoreTeacherTimetableRequest extends StoreTimetableRequest
{
    public function authorize(): bool
    {
        return $this->user()?->isTeacher() && $this->user()?->isActive();
    }
}
