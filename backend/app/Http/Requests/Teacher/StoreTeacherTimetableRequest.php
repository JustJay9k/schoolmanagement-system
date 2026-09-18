<?php

namespace App\Http\Requests\Teacher;

use App\Http\Requests\Admin\StoreTimetableRequest;

class StoreTeacherTimetableRequest extends StoreTimetableRequest
{
    public function authorize(): bool
    {
        return $this->user()?->isTeacher() && $this->user()?->isActive();
    }

    protected function prepareForValidation(): void
    {
        $teacher = $this->user();
        if (empty($this->input('title')) && $teacher) {
            $this->merge([
                'title' => trim(($teacher->assigned_class_name ?? 'Class') . ' Timetable'),
            ]);
        }

        parent::prepareForValidation();
    }
}
