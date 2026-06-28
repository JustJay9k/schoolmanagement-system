<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('student_records', function (Blueprint $table): void {
            $table->foreignId('school_id')
                ->nullable()
                ->after('id')
                ->constrained('schools')
                ->nullOnDelete();
        });

        $fallbackSchoolId = DB::table('schools')
            ->orderBy('id')
            ->value('id');

        DB::table('student_records')
            ->select(['id', 'created_by'])
            ->orderBy('id')
            ->chunkById(100, function ($records) use ($fallbackSchoolId): void {
                foreach ($records as $record) {
                    $schoolId = null;

                    if ($record->created_by) {
                        $schoolId = DB::table('users')
                            ->where('id', $record->created_by)
                            ->value('school_id');
                    }

                    $schoolId ??= $fallbackSchoolId;

                    DB::table('student_records')
                        ->where('id', $record->id)
                        ->update(['school_id' => $schoolId]);
                }
            });

        Schema::table('student_records', function (Blueprint $table): void {
            $table->dropUnique('student_records_student_code_unique');
            $table->unique(['school_id', 'student_code'], 'student_records_school_code_unique');
            $table->index(
                ['school_id', 'school_track', 'class_name'],
                'student_records_school_track_class_index',
            );
        });
    }

    public function down(): void
    {
        Schema::table('student_records', function (Blueprint $table): void {
            $table->dropIndex('student_records_school_track_class_index');
            $table->dropUnique('student_records_school_code_unique');
            $table->unique('student_code');
            $table->dropConstrainedForeignId('school_id');
        });
    }
};
