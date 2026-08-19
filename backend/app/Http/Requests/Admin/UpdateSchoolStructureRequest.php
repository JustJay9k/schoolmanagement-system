<?php

namespace App\Http\Requests\Admin;

use App\Enums\UserRole;
use App\Models\Timetable;
use App\Models\User;
use App\Support\SchoolContextOptions;
use Illuminate\Foundation\Http\FormRequest;

class UpdateSchoolStructureRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->canManageSchoolStructure() ?? false;
    }

    protected function prepareForValidation(): void
    {
        $this->merge([
            'classes_by_track' => [
                'primary' => $this->parseClassList($this->input('primary_classes')),
                'secondary' => $this->parseClassList($this->input('secondary_classes')),
            ],
        ]);
    }

    public function rules(): array
    {
        return [
            'classes_by_track.primary' => ['required', 'array', 'min:1'],
            'classes_by_track.primary.*' => ['required', 'string', 'max:100', 'distinct'],
            'classes_by_track.secondary' => ['required', 'array', 'min:1'],
            'classes_by_track.secondary.*' => ['required', 'string', 'max:100', 'distinct'],
        ];
    }

    public function after(): array
    {
        return [
            function ($validator): void {
                $classesByTrack = SchoolContextOptions::normalizeClassesByTrack(
                    $this->input('classes_by_track', []),
                    fallbackToDefaults: false,
                );

                foreach (SchoolContextOptions::trackValues() as $track) {
                    if (($classesByTrack[$track] ?? []) === []) {
                        $validator->errors()->add(
                            "classes_by_track.{$track}",
                            'Provide at least one class name for this track.',
                        );
                    }
                }

                $teachersWithMissingClasses = User::query()
                    ->where('role', UserRole::Teacher)
                    ->whereNotNull('school_track')
                    ->whereNotNull('assigned_class_name')
                    ->get(['name', 'school_track', 'assigned_class_name'])
                    ->filter(function (User $teacher) use ($classesByTrack): bool {
                        $track = is_string($teacher->school_track) ? $teacher->school_track : null;
                        $className = is_string($teacher->assigned_class_name) ? $teacher->assigned_class_name : null;

                        if (! is_string($track) || ! is_string($className)) {
                            return false;
                        }

                        return ! in_array($className, $classesByTrack[$track] ?? [], true);
                    });

                $teachersWithMissingClasses->each(function (User $teacher) use ($validator): void {
                    $assignmentLabel = $teacher->school_track === 'secondary'
                        ? 'assigned as form teacher to'
                        : 'assigned to';

                    $validator->errors()->add(
                        'classes_by_track',
                        "{$teacher->name} is still {$assignmentLabel} {$teacher->assigned_class_name} in {$teacher->school_track}. Reassign that teacher before removing or renaming the class.",
                    );
                });

                Timetable::query()
                    ->get(['title', 'school_track', 'class_name'])
                    ->filter(function (Timetable $timetable) use ($classesByTrack): bool {
                        return ! in_array($timetable->class_name, $classesByTrack[$timetable->school_track] ?? [], true);
                    })
                    ->each(function (Timetable $timetable) use ($validator): void {
                        $validator->errors()->add(
                            'classes_by_track',
                            "{$timetable->title} is still attached to {$timetable->class_name} in {$timetable->school_track}. Update or remove that timetable before renaming the class.",
                        );
                    });
            },
        ];
    }

    /**
     * @return list<string>
     */
    private function parseClassList(mixed $value): array
    {
        if (! is_string($value)) {
            return [];
        }

        return collect(preg_split('/\r\n|\r|\n/', $value) ?: [])
            ->map(fn (string $className): string => trim($className))
            ->filter()
            ->values()
            ->all();
    }
}
