<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('student_performance_records', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('student_record_id')->constrained()->cascadeOnDelete();
            $table->foreignId('teacher_id')->constrained('users')->cascadeOnDelete();
            $table->string('grade', 120);
            $table->text('comment')->nullable();
            $table->timestamps();

            $table->unique(
                ['student_record_id', 'teacher_id'],
                'student_performance_student_teacher_unique',
            );
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('student_performance_records');
    }
};
