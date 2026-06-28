<?php

namespace App\Http\Requests\Management;

use App\Models\StudentRecord;
use App\Support\SchoolContextOptions;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreStudentRecordRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->canManageTimetables() ?? false;
    }

    protected function prepareForValidation(): void
    {
        $this->merge([
            'full_name' => $this->cleanString($this->input('full_name')),
            'sex' => $this->normalizeSex($this->input('sex')),
            'date_of_birth' => $this->cleanString($this->input('date_of_birth')),
            'age' => $this->normalizeInteger($this->input('age')),
            'student_code' => $this->cleanString($this->input('student_code')),
            'orphan_status' => $this->cleanString($this->input('orphan_status')),
            'disability_name' => $this->cleanString($this->input('disability_name')),
            'guardian_name' => $this->cleanString($this->input('guardian_name')),
            'residence' => $this->cleanString($this->input('residence')),
            'first_entry_date' => $this->cleanString($this->input('first_entry_date')),
        ]);
    }

    public function rules(): array
    {
        return [
            'school_track' => ['required', Rule::in(SchoolContextOptions::trackValues())],
            'class_name' => ['required', 'string', Rule::in(SchoolContextOptions::allClasses())],
            'full_name' => ['required', 'string', 'max:255'],
            'sex' => ['nullable', Rule::in(['male', 'female', 'other'])],
            'date_of_birth' => ['nullable', 'date'],
            'age' => ['nullable', 'integer', 'min:0', 'max:120'],
            'student_code' => [
                'nullable',
                'string',
                'max:100',
                Rule::unique(StudentRecord::class, 'student_code')
                    ->where(fn ($query) => $query->where('school_id', $this->user()?->school_id)),
            ],
            'orphan_status' => ['nullable', 'string', 'max:100'],
            'disability_name' => ['nullable', 'string', 'max:255'],
            'guardian_name' => ['nullable', 'string', 'max:255'],
            'residence' => ['nullable', 'string', 'max:255'],
            'first_entry_date' => ['nullable', 'date'],
        ];
    }

    public function after(): array
    {
        return [
            function ($validator): void {
                $track = $this->string('school_track')->toString();
                $className = $this->string('class_name')->toString();

                if ($track !== '' && $className !== '' && ! SchoolContextOptions::isValidClassForTrack($track, $className)) {
                    $validator->errors()->add('class_name', 'The selected class does not belong to the selected school track.');
                }
            },
        ];
    }

    private function cleanString(mixed $value): ?string
    {
        if (! is_string($value)) {
            return null;
        }

        $value = trim($value);

        return $value === '' ? null : $value;
    }

    private function normalizeSex(mixed $value): ?string
    {
        $cleaned = $this->cleanString($value);

        return $cleaned ? strtolower($cleaned) : null;
    }

    private function normalizeInteger(mixed $value): ?int
    {
        if ($value === null || $value === '') {
            return null;
        }

        return is_numeric($value) ? (int) $value : null;
    }
}
