<?php

namespace App\Http\Controllers\Api\Guardian;

use App\Http\Controllers\Controller;
use App\Models\StudentPerformanceRecord;
use App\Models\StudentRecord;
use App\Support\SchoolContextOptions;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class GuardianChildApiController extends Controller
{
    public function show(Request $request): JsonResponse
    {
        $guardian = $request->user();

        abort_unless($guardian?->isGuardian(), 403);

        $student = $guardian->linkedStudentRecord()
            ->with([
                'school:id,name',
                'performanceRecords' => fn ($query) => $query
                    ->approved()
                    ->with([
                        'teacher:id,name',
                        'assessmentPeriod:id,name,position',
                    ])
                    ->latest(),
            ])
            ->first();

        if (! $student || ($guardian->school_id && $student->school_id !== $guardian->school_id)) {
            return response()->json([
                'message' => 'No learner record is linked to this guardian account yet. Contact the school administrator.',
                'child' => null,
                'announcements' => [],
            ]);
        }

        $classPositions = $this->resolveClassPositions($student);

        return response()->json([
            'child' => $this->serializeStudent($student, $classPositions),
            'announcements' => $guardian->notifications()
                ->limit(5)
                ->get()
                ->map(fn ($notification): array => [
                    'id' => $notification->id,
                    'title' => $notification->title,
                    'message' => $notification->message,
                    'level' => $notification->level,
                    'read_at' => $notification->read_at?->toIso8601String(),
                    'created_at' => $notification->created_at?->toIso8601String(),
                ])
                ->values(),
        ]);
    }

    /**
     * Compute the child's position (rank) and average score within their class,
     * keyed by assessment_period_id.
     *
     * @return array<int, array{position: int|null, average: float|null, total_students: int}>
     */
    private function resolveClassPositions(StudentRecord $student): array
    {
        if (! $student->school_track || ! $student->class_name) {
            return [];
        }

        $classmates = StudentRecord::query()
            ->where('school_id', $student->school_id)
            ->where('school_track', $student->school_track)
            ->where('class_name', $student->class_name)
            ->with([
                'performanceRecords' => fn ($query) => $query
                    ->approved()
                    ->with([
                        'assessmentPeriod:id,name,position',
                    ]),
            ])
            ->get();

        $totalStudents = $classmates->count();

        $averagesByPeriod = [];

        foreach ($classmates as $classmate) {
            foreach ($classmate->performanceRecords as $record) {
                $periodId = $record->assessment_period_id;

                $averagesByPeriod[$periodId][] = [
                    'student_record_id' => $classmate->id,
                    'average' => $this->averageOfSubjectGrades($record->subject_grades),
                ];
            }
        }

        $positions = [];

        foreach ($averagesByPeriod as $periodId => $entries) {
            $sorted = collect($entries)->sortByDesc('average')->values();

            $rank = 0;
            $lastAverage = null;

            $ranks = $sorted->map(function (array $entry) use (&$rank, &$lastAverage): array {
                if ($entry['average'] !== null && $entry['average'] !== $lastAverage) {
                    $rank++;
                    $lastAverage = $entry['average'];
                }

                return [
                    'student_record_id' => $entry['student_record_id'],
                    'position' => $entry['average'] !== null ? $rank : null,
                    'average' => $entry['average'],
                ];
            });

            $childStanding = $ranks->firstWhere('student_record_id', $student->id);

            $positions[$periodId] = [
                'position' => $childStanding['position'] ?? null,
                'average' => $childStanding['average'] ?? null,
                'total_students' => $totalStudents,
            ];
        }

        return $positions;
    }

    /**
     * Convert a grade string to a numeric value (0-100) where possible.
     */
    private function gradeToNumber(string $grade): ?float
    {
        $text = trim($grade);

        if ($text === '') {
            return null;
        }

        if (preg_match('/^(\d+(?:\.\d+)?)\s*\/\s*(\d+(?:\.\d+)?)$/', $text, $fraction) && (float) $fraction[2] > 0) {
            return ((float) $fraction[1] / (float) $fraction[2]) * 100;
        }

        if (preg_match('/^(\d+(?:\.\d+)?)%$/', $text, $percent)) {
            return (float) $percent[1];
        }

        if (is_numeric($text)) {
            $value = (float) $text;

            return $value <= 100 ? $value : null;
        }

        $letterMap = [
            'A+' => 97, 'A' => 93, 'A-' => 90,
            'B+' => 87, 'B' => 83, 'B-' => 80,
            'C+' => 77, 'C' => 73, 'C-' => 70,
            'D+' => 67, 'D' => 63, 'D-' => 60,
            'F' => 50, 'E' => 40,
        ];

        $upper = strtoupper($text);

        return $letterMap[$upper] ?? null;
    }

    /**
     * @param  array<int, array<string, mixed>>|null  $subjectGrades
     */
    private function averageOfSubjectGrades(?array $subjectGrades): ?float
    {
        if (! is_array($subjectGrades) || count($subjectGrades) === 0) {
            return null;
        }

        $values = collect($subjectGrades)
            ->map(fn (array $subjectGrade): ?float => $this->gradeToNumber((string) ($subjectGrade['grade'] ?? '')))
            ->filter(fn (?float $value): bool => $value !== null)
            ->values();

        if ($values->isEmpty()) {
            return null;
        }

        return round(($values->sum() / $values->count()) * 10) / 10;
    }

    /**
     * @param  array<int, array{position: int|null, average: float|null, total_students: int}>  $classPositions
     * @return array<string, mixed>
     */
    private function serializeStudent(StudentRecord $student, array $classPositions): array
    {
        $performanceRecords = $student->performanceRecords
            ->map(function (StudentPerformanceRecord $record) use ($classPositions): array {
                $standing = $classPositions[$record->assessment_period_id] ?? [
                    'position' => null,
                    'average' => null,
                    'total_students' => null,
                ];

                return [
                    'id' => $record->id,
                    'assessment_period_id' => $record->assessment_period_id,
                    'assessment_period_name' => $record->assessmentPeriod?->name ?? 'General',
                    'teacher_name' => $record->teacher?->name ?? 'Teacher',
                    'grade' => $record->grade,
                    'grade_summary' => $record->grade,
                    'subject_grades' => $record->subject_grades ?? [],
                    'average_score' => $standing['average'],
                    'class_position' => $standing['position'],
                    'total_class_students' => $standing['total_students'],
                    'comment' => $record->comment,
                    'updated_at' => $record->updated_at?->toIso8601String(),
                ];
            })
            ->values();

        return [
            'id' => $student->id,
            'full_name' => $student->full_name,
            'school_track' => $student->school_track,
            'school_track_label' => SchoolContextOptions::tracks()[$student->school_track] ?? ucfirst($student->school_track),
            'class_name' => $student->class_name,
            'student_code' => $student->student_code,
            'sex' => $student->sex,
            'date_of_birth' => $student->date_of_birth?->format('Y-m-d'),
            'age' => $student->resolvedAge(),
            'guardian_name' => $student->guardian_name,
            'residence' => $student->residence,
            'first_entry_date' => $student->first_entry_date?->format('Y-m-d'),
            'school_name' => $student->school?->name,
            'latest_grade' => $performanceRecords[0]['grade'] ?? null,
            'latest_grade_summary' => $performanceRecords[0]['grade_summary'] ?? null,
            'latest_assessment_period_name' => $performanceRecords[0]['assessment_period_name'] ?? null,
            'latest_subject_grades' => $performanceRecords[0]['subject_grades'] ?? [],
            'latest_average_score' => $performanceRecords[0]['average_score'] ?? null,
            'latest_class_position' => $performanceRecords[0]['class_position'] ?? null,
            'latest_total_class_students' => $performanceRecords[0]['total_class_students'] ?? null,
            'latest_comment' => $performanceRecords[0]['comment'] ?? null,
            'latest_updated_at' => $performanceRecords[0]['updated_at'] ?? null,
            'performance_records' => $performanceRecords,
        ];
    }
}
