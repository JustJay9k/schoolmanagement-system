<?php

namespace App\Http\Requests\Management;

use App\Support\SchoolContextOptions;
use Illuminate\Foundation\Http\FormRequest;

class UpdateRegisterScheduleRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->canManageTimetables() ?? false;
    }

    public function rules(): array
    {
        return [
            'schedule_by_track.primary' => ['required', 'array', 'min:1'],
            'schedule_by_track.primary.*.label' => ['required', 'string', 'max:100'],
            'schedule_by_track.primary.*.registration_enabled' => ['required', 'boolean'],
            'schedule_by_track.primary.*.start_time' => ['nullable', 'date_format:H:i'],
            'schedule_by_track.primary.*.end_time' => ['nullable', 'date_format:H:i'],
            'schedule_by_track.secondary' => ['required', 'array', 'min:1'],
            'schedule_by_track.secondary.*.label' => ['required', 'string', 'max:100'],
            'schedule_by_track.secondary.*.registration_enabled' => ['required', 'boolean'],
            'schedule_by_track.secondary.*.start_time' => ['nullable', 'date_format:H:i'],
            'schedule_by_track.secondary.*.end_time' => ['nullable', 'date_format:H:i'],
        ];
    }

    public function after(): array
    {
        return [
            function ($validator): void {
                $scheduleByTrack = SchoolContextOptions::normalizeRegisterScheduleByTrack(
                    $this->input('schedule_by_track', []),
                    fallbackToDefaults: false,
                );

                foreach (SchoolContextOptions::trackValues() as $track) {
                    if (($scheduleByTrack[$track] ?? []) === []) {
                        $validator->errors()->add(
                            "schedule_by_track.{$track}",
                            'Provide at least one period for this track.',
                        );
                    }

                    foreach (($scheduleByTrack[$track] ?? []) as $index => $period) {
                        $startTime = $period['start_time'] ?? null;
                        $endTime = $period['end_time'] ?? null;
                        $field = "schedule_by_track.{$track}.{$index}";

                        if ($startTime && ! $endTime) {
                            $validator->errors()->add(
                                "{$field}.end_time",
                                'Add an end time when a start time is provided.',
                            );
                        }

                        if ($endTime && ! $startTime) {
                            $validator->errors()->add(
                                "{$field}.start_time",
                                'Add a start time when an end time is provided.',
                            );
                        }

                        if ($startTime && $endTime && $endTime <= $startTime) {
                            $validator->errors()->add(
                                "{$field}.end_time",
                                'End time must be later than start time.',
                            );
                        }
                    }
                }
            },
        ];
    }
}
