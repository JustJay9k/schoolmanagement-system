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
            if (! Schema::hasColumn('student_performance_records', 'school_track')) {
                $table->string('school_track', 50)
                    ->nullable()
                    ->after('term');
            }

            if (! Schema::hasColumn('student_performance_records', 'class_name')) {
                $table->string('class_name', 120)
                    ->nullable()
                    ->after('school_track');
            }
        });

        $rows = DB::table('student_performance_records')
            ->join('student_records', 'student_records.id', '=', 'student_performance_records.student_record_id')
            ->whereNull('student_performance_records.school_track')
            ->whereNull('student_performance_records.class_name')
            ->get([
                'student_performance_records.id',
                'student_records.school_track as student_school_track',
                'student_records.class_name as student_class_name',
            ]);

        foreach ($rows as $row) {
            DB::table('student_performance_records')
                ->where('id', $row->id)
                ->update([
                    'school_track' => trim((string) $row->student_school_track) ?: null,
                    'class_name' => trim((string) $row->student_class_name) ?: null,
                ]);
        }
    }

    public function down(): void
    {
        Schema::table('student_performance_records', function (Blueprint $table): void {
            if (Schema::hasColumn('student_performance_records', 'class_name')) {
                $table->dropColumn('class_name');
            }

            if (Schema::hasColumn('student_performance_records', 'school_track')) {
                $table->dropColumn('school_track');
            }
        });
    }
};