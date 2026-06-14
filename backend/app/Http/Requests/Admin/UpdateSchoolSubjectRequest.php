<?php

namespace App\Http\Requests\Admin;

use App\Support\SchoolContextOptions;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateSchoolSubjectRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->canManageTimetables() ?? false;
    }

    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:255', Rule::unique('school_subjects', 'name')
                ->ignore($this->route('subject'))
                ->where(fn ($query) => $query->where('school_track', $this->input('school_track')))],
            'code' => ['nullable', 'string', 'max:50'],
            'school_track' => ['required', Rule::in(SchoolContextOptions::trackValues())],
        ];
    }
}
