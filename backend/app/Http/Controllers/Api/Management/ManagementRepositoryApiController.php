<?php

namespace App\Http\Controllers\Api\Management;

use App\Http\Controllers\Controller;
use App\Models\GradeAssessmentPeriod;
use App\Models\StudentPerformanceRecord;
use App\Models\StudentRecord;
use App\Support\GradeScoring;
use App\Support\SchoolContextOptions;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;

class ManagementRepositoryApiController extends Controller
{
    public function records(Request $request): JsonResponse
    {
        $actor = $request->user();

        abort_unless($actor && $actor->canManageTimetables(), 403);

        $assessmentPeriods = GradeAssessmentPeriod::query()
            ->where('school_id', $actor->school_id)
            ->orderBy('position')
            ->orderBy('name')
            ->get(['id', 'name', 'position'])
            ->map(fn (GradeAssessmentPeriod $period): array => [
                'id' => $period->id,
                'name' => $period->name,
                'position' => $period->position,
            ])
            ->values();

        $students = StudentRecord::query()
            ->where('school_id', $actor->school_id)
            ->with([
                'performanceRecords' => fn ($query) => $query
                    ->visibleToHeadTeacher()
                    ->with(['assessmentPeriod:id,name,position']),
            ])
            ->orderBy('school_track')
            ->orderBy('class_name')
            ->orderBy('full_name')
            ->get();

        $serialized = $students->map(
            fn (StudentRecord $student): array => $this->serializeStudent($student),
        )->values();

        $totalRecords = $serialized->sum(
            fn (array $student): int => count($student['periods']),
        );

        return response()->json([
            'tracks' => SchoolContextOptions::tracks(),
            'classesByTrack' => SchoolContextOptions::classesByTrack($actor->school_id),
            'termLabels' => StudentPerformanceRecord::termLabels(),
            'assessmentPeriods' => $assessmentPeriods,
            'stats' => [
                'total_students' => $students->count(),
                'total_records' => $totalRecords,
            ],
            'students' => $serialized,
        ]);
    }

    /**
     * @return array<string, mixed>
     */
    private function serializeStudent(StudentRecord $student): array
    {
        /** @var Collection<int, StudentPerformanceRecord> $performances */
        $performances = $student->performanceRecords;

        $periods = $performances
            ->sortBy(fn (StudentPerformanceRecord $record): string => sprintf(
                '%02d-%05d-%s',
                $this->termSortOrder($record->term),
                (int) ($record->assessmentPeriod?->position ?? PHP_INT_MAX),
                (string) ($record->assessmentPeriod?->name ?? ''),
            ))
            ->values()
            ->map(fn (StudentPerformanceRecord $record): array => [
                'id' => $record->id,
                'assessment_period_id' => $record->assessment_period_id,
                'assessment_period_name' => $record->assessmentPeriod?->name ?? 'General',
                'term' => $record->term,
                'term_label' => $record->term && isset(StudentPerformanceRecord::termLabels()[$record->term])
                    ? StudentPerformanceRecord::termLabels()[$record->term]
                    : 'First Term',
                'status' => $record->status,
                'comment' => $record->comment,
                'grade' => $record->grade,
                'average' => GradeScoring::averageOfSubjectGrades($record->subject_grades ?? []),
                'subject_grades' => $record->subject_grades ?? [],
            ]);

        $allGrades = $performances
            ->flatMap(fn (StudentPerformanceRecord $record): array => $record->subject_grades ?? [])
            ->all();

        $termAverages = [
            'first' => $this->termAverage($performances, StudentPerformanceRecord::TERM_FIRST),
            'second' => $this->termAverage($performances, StudentPerformanceRecord::TERM_SECOND),
            'third' => $this->termAverage($performances, StudentPerformanceRecord::TERM_THIRD),
        ];

        return [
            'id' => $student->id,
            'full_name' => $student->full_name,
            'sex' => $student->sex,
            'school_track' => $student->school_track,
            'school_track_label' => SchoolContextOptions::tracks()[$student->school_track] ?? ucfirst($student->school_track),
            'class_name' => $student->class_name,
            'student_code' => $student->student_code,
            'term_averages' => $termAverages,
            'overall_average' => GradeScoring::averageOfSubjectGrades($allGrades),
            'periods' => $periods,
        ];
    }

    /**
     * @param  Collection<int, StudentPerformanceRecord>  $performances
     */
    private function termAverage(Collection $performances, string $term): ?float
    {
        $grades = $performances
            ->where('term', $term)
            ->flatMap(fn (StudentPerformanceRecord $record): array => $record->subject_grades ?? [])
            ->all();

        return GradeScoring::averageOfSubjectGrades($grades);
    }

    private function termSortOrder(?string $term): int
    {
        return match ($term) {
            StudentPerformanceRecord::TERM_FIRST => 1,
            StudentPerformanceRecord::TERM_SECOND => 2,
            StudentPerformanceRecord::TERM_THIRD => 3,
            default => 4,
        };
    }
}