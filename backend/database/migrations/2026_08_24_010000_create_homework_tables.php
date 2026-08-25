<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('homework', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('school_id')->constrained()->cascadeOnDelete();
            $table->foreignId('teacher_id')->constrained('users')->cascadeOnDelete();
            $table->string('school_track', 20);
            $table->string('class_name', 120);
            $table->string('title', 180);
            $table->text('description')->nullable();
            $table->dateTime('due_date')->nullable();
            $table->timestamps();

            $table->index(['school_id', 'school_track', 'class_name']);
            $table->index('teacher_id');
        });

        Schema::create('homework_questions', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('homework_id')->constrained()->cascadeOnDelete();
            $table->unsignedInteger('position')->default(0);
            $table->text('question_text');
            $table->timestamps();

            $table->index(['homework_id', 'position']);
        });

        Schema::create('homework_attachments', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('homework_id')->constrained()->cascadeOnDelete();
            $table->string('file_path');
            $table->string('original_name');
            $table->string('mime_type', 120);
            $table->unsignedInteger('size_in_kb')->default(0);
            $table->boolean('is_image')->default(false);
            $table->timestamps();

            $table->index('homework_id');
        });

        Schema::create('homework_grades', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('homework_id')->constrained()->cascadeOnDelete();
            $table->foreignId('student_record_id')->constrained()->cascadeOnDelete();
            $table->foreignId('teacher_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('grade', 60);
            $table->text('remarks')->nullable();
            $table->timestamps();

            $table->unique(['homework_id', 'student_record_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('homework_grades');
        Schema::dropIfExists('homework_attachments');
        Schema::dropIfExists('homework_questions');
        Schema::dropIfExists('homework');
    }
};
