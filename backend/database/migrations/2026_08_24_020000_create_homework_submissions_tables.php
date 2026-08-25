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
        Schema::create('homework_submissions', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('homework_id')->constrained()->cascadeOnDelete();
            $table->foreignId('student_record_id')->constrained()->cascadeOnDelete();
            $table->string('status', 20)->default('draft');
            $table->json('answers')->nullable();
            $table->text('notes')->nullable();
            $table->timestamp('submitted_at')->nullable();
            $table->timestamps();

            $table->unique(['homework_id', 'student_record_id']);
            $table->index('status');
        });

        Schema::create('homework_submission_attachments', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('submission_id')->constrained('homework_submissions')->cascadeOnDelete();
            $table->string('file_path');
            $table->string('original_name');
            $table->string('mime_type', 120);
            $table->unsignedInteger('size_in_kb')->default(0);
            $table->boolean('is_image')->default(false);
            $table->timestamps();

            $table->index('submission_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('homework_submission_attachments');
        Schema::dropIfExists('homework_submissions');
    }
};
