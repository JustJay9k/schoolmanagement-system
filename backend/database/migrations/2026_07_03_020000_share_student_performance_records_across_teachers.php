<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        $duplicates = DB::table('student_performance_records')
            ->select(
                'student_record_id',
                'assessment_period_id',
                DB::raw('COUNT(*) as aggregate'),
            )
            ->whereNotNull('assessment_period_id')
            ->groupBy('student_record_id', 'assessment_period_id')
            ->havingRaw('COUNT(*) > 1')
            ->get();

        foreach ($duplicates as $duplicate) {
            $records = DB::table('student_performance_records')
                ->where('student_record_id', $duplicate->student_record_id)
                ->where('assessment_period_id', $duplicate->assessment_period_id)
                ->orderByDesc('updated_at')
                ->orderByDesc('id')
                ->get();

            $keepRecord = $records->first();

            if (! $keepRecord) {
                continue;
            }

            $deleteIds = $records
                ->skip(1)
                ->pluck('id');

            if ($deleteIds->isNotEmpty()) {
                DB::table('student_performance_records')
                    ->whereIn('id', $deleteIds->all())
                    ->delete();
            }
        }

        if (! $this->hasIndex(
            'student_performance_records',
            'student_performance_student_period_unique',
        )) {
            Schema::table('student_performance_records', function (Blueprint $table): void {
                $table->unique(
                    ['student_record_id', 'assessment_period_id'],
                    'student_performance_student_period_unique',
                );
            });
        }

        if ($this->hasIndex(
            'student_performance_records',
            'student_performance_student_teacher_period_unique',
        )) {
            Schema::table('student_performance_records', function (Blueprint $table): void {
                $table->dropUnique('student_performance_student_teacher_period_unique');
            });
        }
    }

    public function down(): void
    {
        if ($this->hasIndex(
            'student_performance_records',
            'student_performance_student_period_unique',
        )) {
            Schema::table('student_performance_records', function (Blueprint $table): void {
                $table->dropUnique('student_performance_student_period_unique');
            });
        }

        if (! $this->hasIndex(
            'student_performance_records',
            'student_performance_student_teacher_period_unique',
        )) {
            Schema::table('student_performance_records', function (Blueprint $table): void {
                $table->unique(
                    ['student_record_id', 'teacher_id', 'assessment_period_id'],
                    'student_performance_student_teacher_period_unique',
                );
            });
        }
    }

    private function hasIndex(string $table, string $indexName): bool
    {
        $driver = DB::getDriverName();

        if ($driver === 'sqlite') {
            $indexes = DB::select("PRAGMA index_list('{$table}')");

            foreach ($indexes as $index) {
                if (($index->name ?? null) === $indexName) {
                    return true;
                }
            }

            return false;
        }

        $indexes = DB::select("SHOW INDEX FROM `{$table}`");

        foreach ($indexes as $index) {
            if (($index->Key_name ?? null) === $indexName) {
                return true;
            }
        }

        return false;
    }
};
