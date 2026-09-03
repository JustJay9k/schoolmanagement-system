<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('student_performance_records', function (Blueprint $table): void {
            if (! Schema::hasColumn('student_performance_records', 'term')) {
                $table->string('term', 20)->default('first')->after('assessment_period_id');
            }
        });

        $this->ensureForeignKeyIndexes();

        if ($this->hasIndex('student_performance_records', 'student_performance_student_teacher_period_unique')) {
            Schema::table('student_performance_records', function (Blueprint $table): void {
                $table->dropUnique('student_performance_student_teacher_period_unique');
            });
        }

        if ($this->hasIndex('student_performance_records', 'student_performance_student_period_unique')) {
            Schema::table('student_performance_records', function (Blueprint $table): void {
                $table->dropUnique('student_performance_student_period_unique');
            });
        }

        if (! $this->hasIndex('student_performance_records', 'student_performance_student_period_term_unique')) {
            Schema::table('student_performance_records', function (Blueprint $table): void {
                $table->unique(
                    ['student_record_id', 'assessment_period_id', 'term'],
                    'student_performance_student_period_term_unique',
                );
            });
        }
    }

    public function down(): void
    {
        $this->ensureForeignKeyIndexes();

        if ($this->hasIndex('student_performance_records', 'student_performance_student_period_term_unique')) {
            Schema::table('student_performance_records', function (Blueprint $table): void {
                $table->dropUnique('student_performance_student_period_term_unique');
            });
        }

        if (! $this->hasIndex('student_performance_records', 'student_performance_student_period_unique')) {
            Schema::table('student_performance_records', function (Blueprint $table): void {
                $table->unique(
                    ['student_record_id', 'assessment_period_id'],
                    'student_performance_student_period_unique',
                );
            });
        }

        Schema::table('student_performance_records', function (Blueprint $table): void {
            if (Schema::hasColumn('student_performance_records', 'term')) {
                $table->dropColumn('term');
            }
        });
    }

    private function ensureForeignKeyIndexes(): void
    {
        $indexes = [
            'student_record_id' => 'student_performance_records_student_record_id_index',
            'teacher_id' => 'student_performance_records_teacher_id_index',
            'assessment_period_id' => 'student_performance_records_assessment_period_id_index',
        ];

        foreach ($indexes as $column => $indexName) {
            if ($this->hasIndex('student_performance_records', $indexName)) {
                continue;
            }

            Schema::table('student_performance_records', function (Blueprint $table) use ($column, $indexName): void {
                $table->index($column, $indexName);
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
