<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('class_promotions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('school_id')->constrained('schools')->cascadeOnDelete();
            $table->foreignId('teacher_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('teacher_name');
            $table->string('school_track', 20);
            $table->string('from_class', 100);
            $table->string('to_class', 100);
            $table->string('status', 20)->default('pending');
            $table->json('students')->nullable();
            $table->json('approved_student_ids')->nullable();
            $table->timestamp('submitted_at')->nullable();
            $table->timestamp('approved_at')->nullable();
            $table->foreignId('approved_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->index(
                ['school_id', 'status'],
                'class_promotions_school_status_index',
            );
            $table->unique(
                ['school_id', 'school_track', 'from_class', 'status'],
                'class_promotions_class_status_unique',
            );
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('class_promotions');
    }
};