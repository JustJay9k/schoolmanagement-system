<?php

namespace App\Http\Requests\Management;

use App\Enums\UserRole;
use App\Enums\UserStatus;
use App\Models\SchoolSubject;
use App\Models\TeacherSubjectAssignment;
use App\Models\User;
use App\Support\SchoolContextOptions;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreTeacherSubjectAssignmentRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->canManageTimetables() ?? false;
    }

    public function rules(): array
    {
        return [
            'teacher_id' => ['required', 'integer', 'exists:users,id'],
            'subject_id' => ['required', 'integer', 'exists:school_subjects,id'],
            'class_name' => ['required', 'string', Rule::in(SchoolContextOptions::classesByTrack()['secondary'] ?? [])],
        ];
    }

    public function after(): array
    {
        return [
            function ($validator): void {
                $teacher = User::query()->find($this->input('teacher_id'));
                $subject = SchoolSubject::query()->find($this->input('subject_id'));
                $className = $this->string('class_name')->toString();

                if (! $teacher || $teacher->role !== UserRole::Teacher) {
                    $validator->errors()->add('teacher_id', 'Choose a valid teacher account.');
                    return;
                }

                if ($teacher->status !== UserStatus::Active || $teacher->school_track !== 'secondary') {
                    $validator->errors()->add('teacher_id', 'Choose an active secondary teacher account.');
                }

                if (! $subject || $subject->school_track !== 'secondary') {
                    $validator->errors()->add('subject_id', 'Choose a subject that belongs to the secondary track.');
                }

                if ($className !== '' && ! SchoolContextOptions::isValidClassForTrack('secondary', $className)) {
                    $validator->errors()->add('class_name', 'Choose a valid secondary class.');
                }

                if ($subject && $className !== '' && TeacherSubjectAssignment::query()
                    ->where('school_track', 'secondary')
                    ->where('class_name', $className)
                    ->where('subject_id', $subject->id)
                    ->exists()) {
                    $validator->errors()->add(
                        'subject_id',
                        'That subject is already assigned to another teacher for the selected class.',
                    );
                }
            },
        ];
    }
}
