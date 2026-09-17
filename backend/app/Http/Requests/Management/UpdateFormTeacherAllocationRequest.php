<?php

namespace App\Http\Requests\Management;

use App\Enums\UserRole;
use App\Enums\UserStatus;
use App\Models\User;
use App\Support\SchoolContextOptions;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateFormTeacherAllocationRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->canManageTimetables() ?? false;
    }

    protected function prepareForValidation(): void
    {
        $this->merge([
            'assigned_class_name' => $this->emptyToNull($this->input('assigned_class_name')),
        ]);
    }

    public function rules(): array
    {
        return [
            'assigned_class_name' => ['nullable', 'string'],
        ];
    }

    public function after(): array
    {
        return [
            function ($validator): void {
                /** @var User|null $teacher */
                $teacher = $this->route('teacher');

                if (! $teacher instanceof User || $teacher->role !== UserRole::Teacher) {
                    $validator->errors()->add('teacher', 'Choose a valid teacher account.');
                    return;
                }

                if (! in_array($teacher->school_track, SchoolContextOptions::trackValues(), true)) {
                    $validator->errors()->add('teacher', 'The teacher must have a valid school track before receiving a class assignment.');
                    return;
                }

                if ($teacher->school_id !== $this->user()?->school_id) {
                    $validator->errors()->add('teacher', 'Choose a teacher from your school.');
                    return;
                }

                $className = $this->string('assigned_class_name')->toString();

                if ($className === '') {
                    return;
                }

                if (! SchoolContextOptions::isValidClassForTrack($teacher->school_track, $className, $teacher->school_id)) {
                    $validator->errors()->add('assigned_class_name', 'That class does not belong to the teacher\'s school track.');
                    return;
                }

                if ($teacher->status !== UserStatus::Active) {
                    $validator->errors()->add('teacher', 'Only active teachers can receive a class assignment.');
                    return;
                }

                if (! SchoolContextOptions::isTeacherClassAvailableForSchool($teacher->school_track, $className, $teacher->school_id, $teacher)) {
                    $validator->errors()->add('assigned_class_name', 'That class already has an assigned teacher.');
                }
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
