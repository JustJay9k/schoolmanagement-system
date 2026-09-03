<?php

namespace App\Http\Requests\Admin;

use App\Enums\UserRole;
use App\Enums\UserStatus;
use App\Models\SchoolSubject;
use App\Models\User;
use App\Support\SchoolContextOptions;
use App\Support\TimetableOptions;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreTimetableRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->canManageTimetables() ?? false;
    }

    protected function prepareForValidation(): void
    {
        $entries = collect($this->input('entries', []))
            ->filter(fn (mixed $entry): bool => is_array($entry))
            ->map(function (array $entry): array {
                return [
                    'day_of_week' => strtolower(trim((string) ($entry['day_of_week'] ?? ''))),
                    'period_label' => trim((string) ($entry['period_label'] ?? '')),
                    'start_time' => $this->emptyToNull($entry['start_time'] ?? null),
                    'end_time' => $this->emptyToNull($entry['end_time'] ?? null),
                    'subject_id' => $this->emptyToNull($entry['subject_id'] ?? null),
                    'room' => $this->emptyToNull($entry['room'] ?? null),
                    'notes' => $this->emptyToNull($entry['notes'] ?? null),
                ];
            })
            ->filter(fn (array $entry): bool => collect($entry)->filter()->isNotEmpty())
            ->values()
            ->all();

        $this->merge([
            'title' => trim((string) $this->input('title')),
            'class_name' => trim((string) $this->input('class_name')),
            'notes' => $this->emptyToNull($this->input('notes')),
            'assigned_teacher_id' => $this->emptyToNull($this->input('assigned_teacher_id')),
            'entries' => $entries,
        ]);
    }

    public function rules(): array
    {
        $schoolId = $this->user()?->school_id;

        return [
            'title' => ['required', 'string', 'max:255'],
            'school_track' => ['required', Rule::in(SchoolContextOptions::trackValues())],
            'class_name' => ['required', 'string', Rule::in(SchoolContextOptions::allClasses($schoolId)), Rule::unique('timetables', 'class_name')
                ->where(fn ($query) => $query->where('school_track', $this->input('school_track')))],
            'assigned_teacher_id' => ['required', 'integer', 'exists:users,id'],
            'notes' => ['nullable', 'string'],
            'entries' => ['required', 'array', 'min:1'],
            'entries.*.day_of_week' => ['required', Rule::in(TimetableOptions::dayValues())],
            'entries.*.period_label' => ['required', 'string', 'max:100'],
            'entries.*.start_time' => ['nullable', 'date_format:H:i'],
            'entries.*.end_time' => ['nullable', 'date_format:H:i'],
            'entries.*.subject_id' => ['required', 'integer', 'exists:school_subjects,id'],
            'entries.*.room' => ['nullable', 'string', 'max:100'],
            'entries.*.notes' => ['nullable', 'string'],
        ];
    }

    public function after(): array
    {
        return [
            function ($validator): void {
                $track = $this->string('school_track')->toString();
                $className = $this->string('class_name')->toString();

                if ($track !== '' && $className !== '' && ! SchoolContextOptions::isValidClassForTrack($track, $className, $this->user()?->school_id)) {
                    $validator->errors()->add('class_name', 'The selected class does not belong to the chosen school track.');
                }

                $teacherId = $this->input('assigned_teacher_id');

                if ($teacherId) {
                    $teacher = User::query()->find($teacherId);

                    if (! $teacher || $teacher->role !== UserRole::Teacher || $teacher->status !== UserStatus::Active) {
                        $validator->errors()->add('assigned_teacher_id', 'Choose an active teacher account for this timetable.');
                    } elseif ($track !== '' && $teacher->school_track !== $track) {
                        $validator->errors()->add('assigned_teacher_id', 'The selected teacher does not belong to this school track.');
                    } elseif ($className !== '' && $teacher->assigned_class_name !== $className) {
                        $validator->errors()->add(
                            'assigned_teacher_id',
                            $track === 'secondary'
                                ? 'Choose the form teacher allocated to this class.'
                                : 'Choose the class teacher allocated to this class.',
                        );
                    }
                }

                collect($this->input('entries', []))->each(function (array $entry, int $index) use ($validator, $track): void {
                    $field = 'entries.'.($index);

                    if (($entry['start_time'] ?? null) && ! ($entry['end_time'] ?? null)) {
                        $validator->errors()->add($field.'.end_time', 'Add an end time when a start time is provided.');
                    }

                    if (($entry['end_time'] ?? null) && ! ($entry['start_time'] ?? null)) {
                        $validator->errors()->add($field.'.start_time', 'Add a start time when an end time is provided.');
                    }

                    if (($entry['start_time'] ?? null) && ($entry['end_time'] ?? null) && $entry['end_time'] <= $entry['start_time']) {
                        $validator->errors()->add($field.'.end_time', 'End time must be later than start time.');
                    }

                    $subject = isset($entry['subject_id'])
                        ? SchoolSubject::query()->find($entry['subject_id'])
                        : null;

                    if (! $subject || $subject->school_id !== $this->user()?->school_id || ($track !== '' && $subject->school_track !== $track)) {
                        $validator->errors()->add($field.'.subject_id', 'Choose a subject that belongs to your school and the selected school track.');
                    }
                });
            },
        ];
    }

    protected function emptyToNull(mixed $value): mixed
    {
        if (! is_string($value)) {
            return $value;
        }

        $trimmed = trim($value);

        return $trimmed === '' ? null : $trimmed;
    }
}
