<?php

namespace App\Http\Requests\Teacher;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class SaveTeacherRegisterReportRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->isTeacher() ?? false;
    }

    public function rules(): array
    {
        return [
            'school_track' => ['required', 'string', Rule::in(['primary', 'secondary'])],
            'class_name' => ['required', 'string', 'max:255'],
            'periods' => ['required', 'array', 'min:1'],
            'periods.*.label' => ['required', 'string', 'max:255'],
            'periods.*.start_time' => ['nullable', 'date_format:H:i'],
            'periods.*.end_time' => ['nullable', 'date_format:H:i'],
            'entries' => ['required', 'array', 'min:1'],
            'entries.*.student_id' => ['required', 'integer'],
            'entries.*.status' => ['required', 'string', Rule::in(['P', 'L', 'S', 'A', 'E'])],
            'entries.*.note' => ['nullable', 'string', 'max:2000'],
        ];
    }
}
