<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('register_reports', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('school_id')->constrained()->cascadeOnDelete();
            $table->foreignId('teacher_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('teacher_name');
            $table->string('school_track');
            $table->string('class_name');
            $table->date('report_date');
            $table->string('status')->default('draft');
            $table->timestamp('submitted_at')->nullable();
            $table->json('periods');
            $table->json('entries');
            $table->json('summary');
            $table->timestamps();

            $table->unique(
                ['school_id', 'teacher_id', 'school_track', 'class_name', 'report_date'],
                'register_reports_teacher_scope_unique',
            );
            $table->index(['school_id', 'status', 'report_date']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('register_reports');
    }
};
