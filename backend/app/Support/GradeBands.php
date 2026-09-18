<?php

namespace App\Support;

use App\Models\SchoolGradeBand;

final class GradeBands
{
    /**
     * Resolve the active grade scale for a school. Returns only the bands
     * the school has actually saved, so nothing is shown until a teacher
     * defines grades for the school.
     *
     * @return list<array{id: int|null, letter: string, min_percentage: int, max_percentage: int}>
     */
    public static function forSchool(?int $schoolId): array
    {
        return SchoolGradeBand::query()
            ->where('school_id', $schoolId)
            ->orderByDesc('min_percentage')
            ->get()
            ->map(fn (SchoolGradeBand $band): array => self::serialize($band))
            ->values()
            ->all();
    }

    /**
     * @return array{id: int, letter: string, min_percentage: int, max_percentage: int}
     */
    public static function serialize(SchoolGradeBand $band): array
    {
        return [
            'id' => $band->id,
            'letter' => $band->letter,
            'min_percentage' => (int) $band->min_percentage,
            'max_percentage' => (int) $band->max_percentage,
        ];
    }
}