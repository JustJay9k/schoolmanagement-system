<?php

namespace App\Support;

final class TimetableOptions
{
    /**
     * @return array<string, string>
     */
    public static function daysOfWeek(): array
    {
        return [
            'monday' => 'Monday',
            'tuesday' => 'Tuesday',
            'wednesday' => 'Wednesday',
            'thursday' => 'Thursday',
            'friday' => 'Friday',
            'saturday' => 'Saturday',
            'sunday' => 'Sunday',
        ];
    }

    /**
     * @return list<string>
     */
    public static function dayValues(): array
    {
        return array_keys(self::daysOfWeek());
    }
}
