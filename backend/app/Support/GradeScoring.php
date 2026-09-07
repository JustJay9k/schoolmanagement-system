<?php

namespace App\Support;

final class GradeScoring
{
    /**
     * Convert a stored grade value (percent, fraction, plain number, or letter)
     * into a numeric score on a 0-100 scale, or null when it cannot be parsed.
     */
    public static function parse(?string $grade): ?float
    {
        if (! is_string($grade)) {
            return null;
        }

        $text = trim($grade);

        if ($text === '') {
            return null;
        }

        if (preg_match('/^(\d+(?:\.\d+)?)\s*\/\s*(\d+(?:\.\d+)?)$/', $text, $matches) === 1) {
            $denominator = (float) $matches[2];

            return $denominator > 0
                ? (($matches[1] / $denominator) * 100)
                : null;
        }

        if (preg_match('/^(\d+(?:\.\d+)?)%$/', $text, $matches) === 1) {
            return (float) $matches[1];
        }

        if (is_numeric($text)) {
            $value = (float) $text;

            return $value <= 100 ? $value : null;
        }

        $letterMap = [
            'A+' => 97,
            'A' => 93,
            'A-' => 90,
            'B+' => 87,
            'B' => 83,
            'B-' => 80,
            'C+' => 77,
            'C' => 73,
            'C-' => 70,
            'D+' => 67,
            'D' => 63,
            'D-' => 60,
            'F' => 50,
            'E' => 40,
        ];

        $upper = mb_strtoupper($text);

        return isset($letterMap[$upper]) ? $letterMap[$upper] : null;
    }

    /**
     * Mean of numeric grade values, rounded to one decimal place, or null.
     *
     * @param  iterable<int, mixed>  $grades
     */
    public static function average(iterable $grades): ?float
    {
        $values = [];

        foreach ($grades as $grade) {
            $value = self::parse(is_string($grade) ? $grade : (is_scalar($grade) ? (string) $grade : null));

            if ($value !== null) {
                $values[] = $value;
            }
        }

        return self::calculate($values);
    }

    /**
     * Mean of subject entries using their stored grade value.
     *
     * @param  array<int, array<string, mixed>>  $subjectGrades
     */
    public static function averageOfSubjectGrades(array $subjectGrades): ?float
    {
        $values = [];

        foreach ($subjectGrades as $entry) {
            if (! is_array($entry)) {
                continue;
            }

            $value = self::parse(isset($entry['grade']) ? (string) $entry['grade'] : null);

            if ($value !== null) {
                $values[] = $value;
            }
        }

        return self::calculate($values);
    }

    /**
     * @param  list<float>  $values
     */
    private static function calculate(array $values): ?float
    {
        if ($values === []) {
            return null;
        }

        return round((array_sum($values) / count($values)) * 10) / 10;
    }
}