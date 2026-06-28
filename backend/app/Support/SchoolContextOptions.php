<?php

namespace App\Support;

use App\Enums\UserRole;
use App\Models\SchoolSetting;
use App\Models\User;
use Illuminate\Support\Facades\Schema;

final class SchoolContextOptions
{
    public const STRUCTURE_KEY = 'school_structure';

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
    public static function classesByTrack(): array
    {
        if (! Schema::hasTable('school_settings')) {
            return self::defaultClassesByTrack();
        }

        $storedValue = SchoolSetting::query()
            ->where('key', self::STRUCTURE_KEY)
            ->value('value');

        return self::normalizeClassesByTrack(
            is_array($storedValue) ? $storedValue : null,
            fallbackToDefaults: true,
        );
    }

    /**
     * @param  array<string, mixed>|null  $classesByTrack
     */
    public static function saveClassesByTrack(?array $classesByTrack): void
    {
        SchoolSetting::query()->updateOrCreate(
            ['key' => self::STRUCTURE_KEY],
            [
                'value' => self::normalizeClassesByTrack(
                    $classesByTrack,
                    fallbackToDefaults: false,
                ),
            ],
        );
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
     * @return list<string>
     */
    public static function allClasses(): array
    {
        return collect(self::classesByTrack())
            ->flatten()
            ->values()
            ->all();
    }

    public static function isValidClassForTrack(?string $track, ?string $className): bool
    {
        if (! is_string($track) || ! is_string($className)) {
            return false;
        }

        return in_array($className, self::classesByTrack()[$track] ?? [], true);
    }

    /**
     * @return array<string, list<string>>
     */
    public static function takenClassesByTrack(?User $ignoreUser = null): array
    {
        $takenClasses = self::emptyTrackBuckets();

        User::query()
            ->where('role', UserRole::Teacher)
            ->whereNotNull('school_track')
            ->whereNotNull('assigned_class_name')
            ->when($ignoreUser, fn ($query) => $query->whereKeyNot($ignoreUser->getKey()))
            ->get(['school_track', 'assigned_class_name'])
            ->each(function (User $teacher) use (&$takenClasses): void {
                $track = is_string($teacher->school_track) ? $teacher->school_track : null;
                $className = is_string($teacher->assigned_class_name) ? $teacher->assigned_class_name : null;

                if (! self::isValidClassForTrack($track, $className)) {
                    return;
                }

                $takenClasses[$track][] = $className;
            });

        return array_map(
            static fn (array $classes): array => array_values(array_unique($classes)),
            $takenClasses,
        );
    }

    /**
     * @return array<string, list<string>>
     */
    public static function takenClassesByTrackForSchool(?int $schoolId, ?User $ignoreUser = null): array
    {
        if (! $schoolId) {
            return self::emptyTrackBuckets();
        }

        $takenClasses = self::emptyTrackBuckets();

        User::query()
            ->where('role', UserRole::Teacher)
            ->where('school_id', $schoolId)
            ->whereNotNull('school_track')
            ->whereNotNull('assigned_class_name')
            ->when($ignoreUser, fn ($query) => $query->whereKeyNot($ignoreUser->getKey()))
            ->get(['school_track', 'assigned_class_name'])
            ->each(function (User $teacher) use (&$takenClasses): void {
                $track = is_string($teacher->school_track) ? $teacher->school_track : null;
                $className = is_string($teacher->assigned_class_name) ? $teacher->assigned_class_name : null;

                if (! self::isValidClassForTrack($track, $className)) {
                    return;
                }

                $takenClasses[$track][] = $className;
            });

        return array_map(
            static fn (array $classes): array => array_values(array_unique($classes)),
            $takenClasses,
        );
    }

    /**
     * @return array<string, list<string>>
     */
    public static function availableClassesByTrack(?User $ignoreUser = null): array
    {
        $takenClasses = self::takenClassesByTrack($ignoreUser);

        return collect(self::classesByTrack())
            ->map(fn (array $classes, string $track): array => array_values(
                array_diff($classes, $takenClasses[$track] ?? []),
            ))
            ->all();
    }

    public static function isTeacherClassAvailable(?string $track, ?string $className, ?User $ignoreUser = null): bool
    {
        if (! self::isValidClassForTrack($track, $className)) {
            return false;
        }

        return ! in_array($className, self::takenClassesByTrack($ignoreUser)[$track] ?? [], true);
    }

    public static function isTeacherClassAvailableForSchool(
        ?string $track,
        ?string $className,
        ?int $schoolId,
        ?User $ignoreUser = null,
    ): bool {
        if (! self::isValidClassForTrack($track, $className)) {
            return false;
        }

        if (! $schoolId) {
            return true;
        }

        return ! in_array($className, self::takenClassesByTrackForSchool($schoolId, $ignoreUser)[$track] ?? [], true);
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
}
