<?php

namespace App\Http\Requests\Management;

use App\Models\StudentRecord;
use App\Support\SchoolContextOptions;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class ImportStudentRecordsRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->canManageTimetables() ?? false;
    }

    protected function prepareForValidation(): void
    {
        $records = collect($this->input('records', []))
            ->filter(fn (mixed $row): bool => is_array($row))
            ->map(function (array $row): array {
                return [
                    'full_name' => $this->cleanString($row['full_name'] ?? null),
                    'sex' => $this->normalizeSex($row['sex'] ?? null),
                    'date_of_birth' => $this->cleanString($row['date_of_birth'] ?? null),
                    'age' => $this->normalizeInteger($row['age'] ?? null),
                    'student_code' => $this->cleanString($row['student_code'] ?? null),
                    'orphan_status' => $this->cleanString($row['orphan_status'] ?? null),
                    'disability_name' => $this->cleanString($row['disability_name'] ?? null),
                    'guardian_name' => $this->cleanString($row['guardian_name'] ?? null),
                    'residence' => $this->cleanString($row['residence'] ?? null),
                    'first_entry_date' => $this->cleanString($row['first_entry_date'] ?? null),
                ];
            })
            ->filter(fn (array $row): bool => collect($row)->except('age')->filter()->isNotEmpty() || filled($row['age']))
            ->values()
            ->all();

        $this->merge([
            'records' => $records,
        ]);
    }

    public function rules(): array
    {
        return [
            'school_track' => ['required', Rule::in(SchoolContextOptions::trackValues())],
            'class_name' => ['required', 'string', Rule::in(SchoolContextOptions::allClasses($this->user()?->school_id))],
            'records' => ['required', 'array', 'min:1'],
            'records.*.full_name' => ['required', 'string', 'max:255'],
            'records.*.sex' => ['nullable', Rule::in(['male', 'female', 'other'])],
            'records.*.date_of_birth' => ['nullable', 'date'],
            'records.*.age' => ['nullable', 'integer', 'min:0', 'max:120'],
            'records.*.student_code' => ['nullable', 'string', 'max:100'],
            'records.*.orphan_status' => ['nullable', 'string', 'max:100'],
            'records.*.disability_name' => ['nullable', 'string', 'max:255'],
            'records.*.guardian_name' => ['nullable', 'string', 'max:255'],
            'records.*.residence' => ['nullable', 'string', 'max:255'],
            'records.*.first_entry_date' => ['nullable', 'date'],
        ];
    }

    public function after(): array
    {
        return [
            function ($validator): void {
                $track = $this->string('school_track')->toString();
                $className = $this->string('class_name')->toString();

                if ($track !== '' && $className !== '' && ! SchoolContextOptions::isValidClassForTrack($track, $className, $this->user()?->school_id)) {
                    $validator->errors()->add('class_name', 'The selected class does not belong to the selected school track.');
                }

                $seenCodes = [];

                collect($this->input('records', []))->each(function (array $row, int $index) use ($validator, &$seenCodes): void {
                    $studentCode = $row['student_code'] ?? null;

                    if (! is_string($studentCode) || $studentCode === '') {
                        return;
                    }

                    if (in_array($studentCode, $seenCodes, true)) {
                        $validator->errors()->add("records.{$index}.student_code", 'The uploaded sheet contains the same student code more than once.');
                        return;
                    }

                    $seenCodes[] = $studentCode;

                    if (StudentRecord::query()->where('student_code', $studentCode)->exists()) {
                        return;
                    }
                });
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
