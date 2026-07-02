<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('grade_assessment_periods')) {
            Schema::create('grade_assessment_periods', function (Blueprint $table): void {
                $table->id();
                $table->foreignId('school_id')->constrained()->cascadeOnDelete();
                $table->string('name', 120);
                $table->unsignedInteger('position')->default(1);
                $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
                $table->timestamps();

                $table->unique(['school_id', 'name'], 'grade_assessment_periods_school_name_unique');
            });
        }

        Schema::table('student_performance_records', function (Blueprint $table): void {
            if (! Schema::hasColumn('student_performance_records', 'assessment_period_id')) {
                $table->foreignId('assessment_period_id')
                    ->nullable()
                    ->after('teacher_id')
                    ->constrained('grade_assessment_periods')
                    ->nullOnDelete();
            }
        });

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

        if ($this->hasIndex(
            'student_performance_records',
            'student_performance_student_teacher_unique',
        )) {
            Schema::table('student_performance_records', function (Blueprint $table): void {
                $table->dropUnique('student_performance_student_teacher_unique');
            });
        }

        if (! Schema::hasTable('grade_assessment_periods')) {
            return;
        }

        if (! Schema::hasColumn('student_performance_records', 'assessment_period_id')) {
            return;
        }

        $schoolIds = DB::table('student_performance_records')
            ->join('student_records', 'student_records.id', '=', 'student_performance_records.student_record_id')
            ->distinct()
            ->pluck('student_records.school_id')
            ->filter();

        foreach ($schoolIds as $schoolId) {
            $timestamp = now();

            $existingPeriodId = DB::table('grade_assessment_periods')
                ->where('school_id', $schoolId)
                ->where('name', 'General')
                ->value('id');

            $periodId = $existingPeriodId;

            if (! $periodId) {
                $periodId = DB::table('grade_assessment_periods')->insertGetId([
                    'school_id' => $schoolId,
                    'name' => 'General',
                    'position' => 1,
                    'created_at' => $timestamp,
                    'updated_at' => $timestamp,
                ]);
            }

            $studentIds = DB::table('student_records')
                ->where('school_id', $schoolId)
                ->pluck('id');

            if ($studentIds->isEmpty()) {
                continue;
            }

            DB::table('student_performance_records')
                ->whereIn('student_record_id', $studentIds)
                ->whereNull('assessment_period_id')
                ->update([
                    'assessment_period_id' => $periodId,
                ]);
        }
    }

    public function down(): void
    {
        Schema::table('student_performance_records', function (Blueprint $table): void {
            if ($this->hasIndex(
                'student_performance_records',
                'student_performance_student_teacher_period_unique',
            )) {
                $table->dropUnique('student_performance_student_teacher_period_unique');
            }
        });

        Schema::table('student_performance_records', function (Blueprint $table): void {
            if (Schema::hasColumn('student_performance_records', 'assessment_period_id')) {
                $table->dropConstrainedForeignId('assessment_period_id');
            }
        });

        if (! $this->hasIndex(
            'student_performance_records',
            'student_performance_student_teacher_unique',
        )) {
            Schema::table('student_performance_records', function (Blueprint $table): void {
                $table->unique(
                    ['student_record_id', 'teacher_id'],
                    'student_performance_student_teacher_unique',
                );
            });
        }

        Schema::dropIfExists('grade_assessment_periods');
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
