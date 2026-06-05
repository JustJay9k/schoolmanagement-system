<?php

namespace App\Support;

use App\Enums\UserRole;
use App\Models\User;

final class SchoolContextOptions
{
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
        return [
            'primary' => [
                'Standard 5 - East',
                'Standard 7 - West',
            ],
            'secondary' => [
                'Year 10 - English (10A)',
                'Form 2 North',
            ],
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
        return array_values(
            array_merge(...array_values(self::classesByTrack())),
        );
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
