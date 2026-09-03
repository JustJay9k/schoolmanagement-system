<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasColumn('school_subjects', 'school_id')) {
            Schema::table('school_subjects', function (Blueprint $table): void {
                $table->foreignId('school_id')->nullable()->after('created_by');
            });
        }

        $defaultSchoolId = DB::table('schools')
            ->where('name', trim((string) config('app.name')))
            ->value('id');

        if (! $defaultSchoolId) {
            $defaultSchoolId = DB::table('schools')->orderBy('id')->value('id');
        }

        if ($defaultSchoolId) {
            DB::table('school_subjects')
                ->whereNull('school_id')
                ->update(['school_id' => $defaultSchoolId]);
        }

        Schema::table('school_subjects', function (Blueprint $table): void {
            $table->dropUnique(['school_track', 'name']);
        });

        Schema::table('school_subjects', function (Blueprint $table): void {
            $table->foreign('school_id')->references('id')->on('schools')->nullOnDelete();
            $table->unique(['school_id', 'school_track', 'name']);
        });
    }

    public function down(): void
    {
        Schema::table('school_subjects', function (Blueprint $table): void {
            $table->dropUnique(['school_id', 'school_track', 'name']);
            $table->dropForeign(['school_id']);
        });

        Schema::table('school_subjects', function (Blueprint $table): void {
            $table->unique(['school_track', 'name']);
        });

        Schema::table('school_subjects', function (Blueprint $table): void {
            $table->dropColumn('school_id');
        });
    }
};
