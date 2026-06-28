<?php

namespace App\Http\Requests\Admin;

use App\Enums\UserRole;
use App\Enums\UserStatus;
use App\Models\School;
use App\Support\SchoolContextOptions;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Password;

class UpdateAdminUserRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->canAccessAdminPanel() ?? false;
    }

    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'string', 'lowercase', 'email', 'max:255', Rule::unique('users', 'email')->ignore($this->route('user'))],
            'role' => ['required', Rule::in(UserRole::values())],
            'status' => ['required', Rule::in(UserStatus::values())],
            'school_id' => ['nullable', 'integer', 'exists:schools,id'],
            'school_name' => ['nullable', 'string', 'max:180'],
            'school_track' => ['nullable', Rule::in(SchoolContextOptions::trackValues())],
            'assigned_class_name' => ['nullable', 'string', Rule::in(SchoolContextOptions::allClasses())],
            'email_verified' => ['nullable', 'boolean'],
            'password' => ['nullable', 'confirmed', Password::defaults()],
        ];
    }

    public function after(): array
    {
        return [
            function ($validator): void {
                $role = $this->string('role')->toString();
                $schoolId = $this->input('school_id');
                $schoolName = trim($this->string('school_name')->toString());
                $track = $this->string('school_track')->toString();
                $className = $this->string('assigned_class_name')->toString();

                if (! $schoolId && $schoolName === '') {
                    $validator->errors()->add('school_id', 'Choose an existing school or enter a new school name.');
                }

                if ($role !== UserRole::Teacher->value) {
                    return;
                }

                if ($track === '') {
                    $validator->errors()->add('school_track', 'Choose whether this teacher belongs to primary or secondary.');
                    return;
                }

                if ($track === 'primary' && $className === '') {
                    $validator->errors()->add('assigned_class_name', 'Choose the primary class this teacher will manage.');
                    return;
                }

                if ($className === '') {
                    return;
                }

                if (! SchoolContextOptions::isValidClassForTrack($track, $className)) {
                    $validator->errors()->add('assigned_class_name', 'The selected class does not belong to the chosen track.');
                    return;
                }

                $targetSchoolId = $this->targetSchoolId();

                if (! SchoolContextOptions::isTeacherClassAvailableForSchool(
                    $track,
                    $className,
                    $targetSchoolId,
                    $this->route('user'),
                )) {
                    $message = $track === 'secondary'
                        ? 'That form class already has a form teacher.'
                        : 'That class is already assigned to another teacher.';

                    $validator->errors()->add('assigned_class_name', $message);
                }
            },
        ];
    }

    private function targetSchoolId(): ?int
    {
        $schoolId = $this->input('school_id');
        if (is_numeric($schoolId)) {
            return (int) $schoolId;
        }

        $schoolName = Str::squish($this->string('school_name')->toString());
        if ($schoolName === '') {
            return null;
        }

        return School::query()
            ->whereRaw('LOWER(name) = ?', [Str::lower($schoolName)])
            ->value('id');
    }
}
