<?php

namespace App\Http\Requests\Teacher;

use Illuminate\Foundation\Http\FormRequest;

class UpsertStudentPerformanceRequest extends FormRequest
{
    public function authorize(): bool
    {
        $user = $this->user();

        return $user !== null && ($user->isTeacher() || $user->canManageTimetables());
    }

    protected function prepareForValidation(): void
    {
        $this->merge([
            'grade' => is_string($this->input('grade')) ? trim($this->input('grade')) : $this->input('grade'),
            'comment' => is_string($this->input('comment')) ? trim($this->input('comment')) : $this->input('comment'),
        ]);
    }

    public function rules(): array
    {
        return [
            'grade' => ['required', 'string', 'max:120'],
            'comment' => ['nullable', 'string', 'max:2000'],
        ];
    }
}
