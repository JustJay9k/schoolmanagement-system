<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('student_performance_records', function (Blueprint $table): void {
            $table->json('subject_grades')->nullable()->after('grade');
        });
    }

    public function down(): void
    {
        Schema::table('student_performance_records', function (Blueprint $table): void {
            $table->dropColumn('subject_grades');
        });
    }
};
