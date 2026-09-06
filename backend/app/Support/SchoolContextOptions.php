<?php

namespace App\Support;

use App\Enums\UserRole;
use App\Models\SchoolSetting;
use App\Models\User;
use Illuminate\Support\Facades\Schema;

final class SchoolContextOptions
{
    public const STRUCTURE_KEY = 'school_structure';
    public const REGISTER_SCHEDULE_KEY = 'register_schedule';
    public const ACTIVE_TERM_KEY = 'active_term';

    public const DEFAULT_ACTIVE_TERM = 'first';

    /**
     * @return array<string, string>
     */
    public static function tracks(): array
    {
        return [
            'primary' => 'Primary',
            'secondary' => 'Secondary',
        ];
    }

    /**
     * @return array<string, list<string>>
     */
    public static function classesByTrack(?int $schoolId = null): array
    {
        if (! Schema::hasTable('school_settings')) {
            return self::defaultClassesByTrack();
        }

        $query = SchoolSetting::query()->where('key', self::STRUCTURE_KEY);

        if (Schema::hasColumn('school_settings', 'school_id')) {
            $query->where('school_id', $schoolId);
        }

        $storedValue = $query->value('value');

        return self::normalizeClassesByTrack(
            is_array($storedValue) ? $storedValue : null,
            fallbackToDefaults: true,
        );
    }

    /**
     * @param  array<string, mixed>|null  $classesByTrack
     */
    public static function saveClassesByTrack(?array $classesByTrack, ?int $schoolId = null): void
    {
        $identity = ['key' => self::STRUCTURE_KEY];

        if (Schema::hasColumn('school_settings', 'school_id')) {
            $identity['school_id'] = $schoolId;
        }

        SchoolSetting::query()->updateOrCreate(
            $identity,
            [
                'value' => self::normalizeClassesByTrack(
                    $classesByTrack,
                    fallbackToDefaults: false,
                ),
            ],
        );
    }

    /**
     * @return array<string, list<array{label: string, registration_enabled: bool, start_time: ?string, end_time: ?string}>>
     */
    public static function registerScheduleByTrack(): array
    {
        if (! Schema::hasTable('school_settings')) {
            return self::defaultRegisterScheduleByTrack();
        }

        $query = SchoolSetting::query()->where('key', self::REGISTER_SCHEDULE_KEY);

        if (Schema::hasColumn('school_settings', 'school_id')) {
            $query->whereNull('school_id');
        }

        $storedValue = $query->value('value');

        return self::normalizeRegisterScheduleByTrack(
            is_array($storedValue) ? $storedValue : null,
            fallbackToDefaults: true,
        );
    }

    /**
     * @param  array<string, mixed>|null  $scheduleByTrack
     */
    public static function saveRegisterScheduleByTrack(?array $scheduleByTrack): void
    {
        $identity = ['key' => self::REGISTER_SCHEDULE_KEY];

        if (Schema::hasColumn('school_settings', 'school_id')) {
            $identity['school_id'] = null;
        }

        SchoolSetting::query()->updateOrCreate(
            $identity,
            [
                'value' => self::normalizeRegisterScheduleByTrack(
                    $scheduleByTrack,
                    fallbackToDefaults: false,
                ),
            ],
        );
    }

    /**
     * @return array<string, list<array{label: string, registration_enabled: bool, start_time: ?string, end_time: ?string}>>
     */
    public static function defaultRegisterScheduleByTrack(): array
    {
        return [
            'primary' => [
                ['label' => 'AM', 'registration_enabled' => true, 'start_time' => '07:30', 'end_time' => '08:00'],
                ['label' => 'PM', 'registration_enabled' => true, 'start_time' => '13:00', 'end_time' => '13:15'],
                ['label' => 'Block 1', 'registration_enabled' => true, 'start_time' => '08:15', 'end_time' => '09:00'],
                ['label' => 'Block 2', 'registration_enabled' => false, 'start_time' => '09:15', 'end_time' => '10:00'],
                ['label' => 'Block 3', 'registration_enabled' => false, 'start_time' => '10:30', 'end_time' => '11:15'],
                ['label' => 'Block 4', 'registration_enabled' => false, 'start_time' => '11:30', 'end_time' => '12:15'],
            ],
            'secondary' => [
                ['label' => 'AM', 'registration_enabled' => true, 'start_time' => '07:30', 'end_time' => '08:00'],
                ['label' => 'PM', 'registration_enabled' => true, 'start_time' => '13:00', 'end_time' => '13:15'],
                ['label' => 'Period 1', 'registration_enabled' => true, 'start_time' => '09:00', 'end_time' => '10:00'],
                ['label' => 'Period 2', 'registration_enabled' => false, 'start_time' => '10:00', 'end_time' => '11:00'],
                ['label' => 'Period 3', 'registration_enabled' => false, 'start_time' => '11:15', 'end_time' => '12:15'],
                ['label' => 'Period 4', 'registration_enabled' => false, 'start_time' => '13:15', 'end_time' => '14:15'],
            ],
        ];
    }

    /**
     * @return array<string, list<string>>
     */
    public static function defaultClassesByTrack(): array
    {
        return [
            'primary' => array_map(
                static fn (int $standard): string => "Standard {$standard}",
                range(1, 8),
            ),
            'secondary' => array_map(
                static fn (int $form): string => "Form {$form}",
                range(1, 4),
            ),
        ];
    }

    /**
     * @return list<string>
     */
    public static function trackValues(): array
    {
        return array_keys(self::tracks());
    }

    /**
     * Resolve the term teachers may currently grade for a given school.
     */
    public static function activeTerm(?int $schoolId = null): string
    {
        if (! Schema::hasTable('school_settings')) {
            return self::DEFAULT_ACTIVE_TERM;
        }

        $query = SchoolSetting::query()->where('key', self::ACTIVE_TERM_KEY);

        if (Schema::hasColumn('school_settings', 'school_id')) {
            $query->where('school_id', $schoolId);
        }

        $storedValue = $query->value('value');

        $normalized = self::normalizeActiveTerm(is_string($storedValue) ? $storedValue : null);

        if ($normalized) {
            return $normalized;
        }

        return self::DEFAULT_ACTIVE_TERM;
    }

    /**
     * Persist the term teachers may currently grade for a given school.
     */
    public static function saveActiveTerm(?string $term, ?int $schoolId = null): string
    {
        $normalized = self::normalizeActiveTerm($term) ?? self::DEFAULT_ACTIVE_TERM;

        $identity = ['key' => self::ACTIVE_TERM_KEY];

        if (Schema::hasColumn('school_settings', 'school_id')) {
            $identity['school_id'] = $schoolId;
        }

        SchoolSetting::query()->updateOrCreate($identity, [
            'value' => $normalized,
        ]);

        return $normalized;
    }

    private static function normalizeActiveTerm(?string $term): ?string
    {
        $terms = \App\Models\StudentPerformanceRecord::termLabels();

        return is_string($term) && isset($terms[$term]) ? $term : null;
    }

    /**
     * @return list<string>
     */
    public static function allClasses(?int $schoolId = null): array
    {
        return collect(self::classesByTrack($schoolId))
            ->flatten()
            ->values()
            ->all();
    }

    public static function isValidClassForTrack(?string $track, ?string $className, ?int $schoolId = null): bool
    {
        if (! is_string($track) || ! is_string($className)) {
            return false;
        }

        return in_array($className, self::classesByTrack($schoolId)[$track] ?? [], true);
    }

    /**
     * @return array<string, list<string>>
     */
    public static function takenClassesByTrack(?User $ignoreUser = null, ?int $schoolId = null): array
    {
        $takenClasses = self::emptyTrackBuckets();

        User::query()
            ->where('role', UserRole::Teacher)
            ->when($schoolId, fn ($query) => $query->where('school_id', $schoolId))
            ->whereNotNull('school_track')
            ->whereNotNull('assigned_class_name')
            ->when($ignoreUser, fn ($query) => $query->whereKeyNot($ignoreUser->getKey()))
            ->get(['school_id', 'school_track', 'assigned_class_name'])
            ->each(function (User $teacher) use (&$takenClasses): void {
                $track = is_string($teacher->school_track) ? $teacher->school_track : null;
                $className = is_string($teacher->assigned_class_name) ? $teacher->assigned_class_name : null;

                if (! self::isValidClassForTrack($track, $className, $teacher->school_id)) {
                    return;
                }

                $takenClasses[$track][] = $className;
            });

        return self::uniqueTrackBuckets($takenClasses);
    }

    /**
     * @return array<string, list<string>>
     */
    public static function takenClassesByTrackForSchool(?int $schoolId, ?User $ignoreUser = null): array
    {
        if (! $schoolId) {
            return self::emptyTrackBuckets();
        }

        return self::takenClassesByTrack($ignoreUser, $schoolId);
    }

    /**
     * @return array<string, list<string>>
     */
    public static function availableClassesByTrack(?User $ignoreUser = null, ?int $schoolId = null): array
    {
        $takenClasses = self::takenClassesByTrack($ignoreUser, $schoolId);

        return collect(self::classesByTrack($schoolId))
            ->map(fn (array $classes, string $track): array => array_values(
                array_diff($classes, $takenClasses[$track] ?? []),
            ))
            ->all();
    }

    public static function isTeacherClassAvailable(?string $track, ?string $className, ?User $ignoreUser = null, ?int $schoolId = null): bool
    {
        if (! self::isValidClassForTrack($track, $className, $schoolId)) {
            return false;
        }

        return ! in_array($className, self::takenClassesByTrack($ignoreUser, $schoolId)[$track] ?? [], true);
    }

    public static function isTeacherClassAvailableForSchool(
        ?string $track,
        ?string $className,
        ?int $schoolId,
        ?User $ignoreUser = null,
    ): bool {
        if (! self::isValidClassForTrack($track, $className, $schoolId)) {
            return false;
        }

        if (! $schoolId) {
            return true;
        }

        return ! in_array($className, self::takenClassesByTrackForSchool($schoolId, $ignoreUser)[$track] ?? [], true);
    }

    /**
     * @param  array<string, mixed>|null  $scheduleByTrack
     * @return array<string, list<array{label: string, registration_enabled: bool, start_time: ?string, end_time: ?string}>>
     */
    public static function normalizeRegisterScheduleByTrack(?array $scheduleByTrack, bool $fallbackToDefaults): array
    {
        $defaults = self::defaultRegisterScheduleByTrack();
        $normalized = [];

        foreach (self::trackValues() as $track) {
            $candidate = $scheduleByTrack[$track] ?? null;
            $periods = collect(is_array($candidate) ? $candidate : [])
                ->map(function (mixed $entry): ?array {
                    if (! is_array($entry)) {
                        return null;
                    }

                    $label = trim((string) ($entry['label'] ?? ''));

                    if ($label === '') {
                        return null;
                    }

                    return [
                        'label' => $label,
                        'registration_enabled' => filter_var(
                            $entry['registration_enabled'] ?? false,
                            FILTER_VALIDATE_BOOL,
                        ),
                        'start_time' => self::normalizeScheduleTime($entry['start_time'] ?? null),
                        'end_time' => self::normalizeScheduleTime($entry['end_time'] ?? null),
                    ];
                })
                ->filter()
                ->values()
                ->all();

            $normalized[$track] = $periods !== []
                ? $periods
                : ($fallbackToDefaults ? $defaults[$track] : []);
        }

        return $normalized;
    }

    private static function normalizeScheduleTime(mixed $value): ?string
    {
        if (! is_string($value)) {
            return null;
        }

        $trimmed = trim($value);

        return preg_match('/^\d{2}:\d{2}$/', $trimmed) === 1 ? $trimmed : null;
    }

    /**
     * @param  array<string, mixed>|null  $classesByTrack
     * @return array<string, list<string>>
     */
    public static function normalizeClassesByTrack(?array $classesByTrack, bool $fallbackToDefaults): array
    {
        $defaults = self::defaultClassesByTrack();
        $normalized = [];

        foreach (self::trackValues() as $track) {
            $candidate = $classesByTrack[$track] ?? null;
            $classes = is_array($candidate) ? $candidate : [];

            $cleanedClasses = collect($classes)
                ->filter(fn ($value) => is_string($value))
                ->map(fn (string $className): string => trim($className))
                ->filter()
                ->unique()
                ->values()
                ->all();

            $normalized[$track] = $fallbackToDefaults && $cleanedClasses === []
                ? $defaults[$track]
                : $cleanedClasses;
        }

        return $normalized;
    }

    /**
     * @return array<string, list<string>>
     */
    private static function emptyTrackBuckets(): array
    {
        return collect(self::trackValues())
            ->mapWithKeys(fn (string $track): array => [$track => []])
            ->all();
    }

    /**
     * @param  array<string, list<string>>  $takenClasses
     * @return array<string, list<string>>
     */
    private static function uniqueTrackBuckets(array $takenClasses): array
    {
        return array_map(
            static fn (array $classes): array => array_values(array_unique($classes)),
            $takenClasses,
        );
    }
}
