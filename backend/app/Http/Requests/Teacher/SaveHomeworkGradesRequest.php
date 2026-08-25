<?php

namespace App\Http\Requests\Teacher;

use Illuminate\Foundation\Http\FormRequest;

class SaveHomeworkGradesRequest extends FormRequest
{
    public function authorize(): bool
    {
        $user = $this->user();

        return $user?->isTeacher() && $user->isActive();
    }

    public function rules(): array
    {
        return [
            'grades' => ['required', 'array', 'min:1', 'max:200'],
            'grades.*.student_id' => ['required', 'integer'],
            'grades.*.grade' => ['required', 'string', 'max:60'],
            'grades.*.remarks' => ['nullable', 'string', 'max:1000'],
        ];
    }

    public function messages(): array
    {
        return [
            'grades.*.grade.required' => 'Enter a grade for every learner you are saving.',
            'grades.*.grade.max' => 'Grades must be 60 characters or fewer.',
        ];
    }
}
