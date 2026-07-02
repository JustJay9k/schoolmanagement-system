<?php

namespace App\Http\Requests\Teacher;

use App\Models\SchoolSubject;
use App\Models\StudentRecord;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

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
            'comment' => is_string($this->input('comment')) ? trim($this->input('comment')) : $this->input('comment'),
            'subject_grades' => collect($this->input('subject_grades', []))
                ->map(fn ($entry): array => [
                    'subject_id' => isset($entry['subject_id']) ? (int) $entry['subject_id'] : null,
                    'grade' => is_string($entry['grade'] ?? null) ? trim($entry['grade']) : ($entry['grade'] ?? null),
                ])
                ->values()
                ->all(),
        ]);
    }

    public function rules(): array
    {
        return [
            'subject_grades' => ['required', 'array', 'min:1'],
            'subject_grades.*.subject_id' => ['required', 'integer', 'distinct', Rule::exists('school_subjects', 'id')],
            'subject_grades.*.grade' => ['required', 'string', 'max:120'],
            'comment' => ['nullable', 'string', 'max:2000'],
        ];
    }

    public function withValidator($validator): void
    {
        $validator->after(function ($validator): void {
            /** @var StudentRecord|null $student */
            $student = $this->route('student');

            if (! $student instanceof StudentRecord) {
                return;
            }

            $subjects = SchoolSubject::query()
                ->where('school_track', $student->school_track)
                ->orderBy('name')
                ->get(['id']);

            if ($subjects->isEmpty()) {
                $validator->errors()->add(
                    'subject_grades',
                    'No subjects have been configured for this school track yet. Add the subjects first.',
                );

                return;
            }

            $requiredSubjectIds = $subjects
                ->pluck('id')
                ->map(fn ($id): int => (int) $id)
                ->sort()
                ->values();

            $submittedSubjectIds = collect($this->input('subject_grades', []))
                ->pluck('subject_id')
                ->filter(fn ($id) => $id !== null)
                ->map(fn ($id): int => (int) $id)
                ->sort()
                ->values();

            if ($submittedSubjectIds->all() !== $requiredSubjectIds->all()) {
                $validator->errors()->add(
                    'subject_grades',
                    'Provide a grade for every subject configured for this school track.',
                );
            }
        });
    }
}
