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
            'assigned_class_name' => ['nullable', 'string', Rule::in(SchoolContextOptions::classesByTrack()['secondary'] ?? [])],
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

                if ($teacher->school_track !== 'secondary') {
                    $validator->errors()->add('teacher', 'Only secondary teachers can be allocated as form teachers.');
                    return;
                }

                $className = $this->string('assigned_class_name')->toString();

                if ($className === '') {
                    return;
                }

                if ($teacher->status !== UserStatus::Active) {
                    $validator->errors()->add('teacher', 'Only active secondary teachers can receive a form class.');
                    return;
                }

                if (! SchoolContextOptions::isTeacherClassAvailableForSchool('secondary', $className, $teacher->school_id, $teacher)) {
                    $validator->errors()->add('assigned_class_name', 'That form class already has a form teacher.');
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
