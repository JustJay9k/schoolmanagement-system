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
        Schema::create('student_records', function (Blueprint $table): void {
            $table->id();
            $table->string('school_track', 20);
            $table->string('class_name', 100);
            $table->string('full_name');
            $table->string('sex', 20)->nullable();
            $table->date('date_of_birth')->nullable();
            $table->unsignedSmallInteger('age')->nullable();
            $table->string('student_code', 100)->nullable()->unique();
            $table->string('orphan_status', 100)->nullable();
            $table->string('disability_name')->nullable();
            $table->string('guardian_name')->nullable();
            $table->string('residence')->nullable();
            $table->date('first_entry_date')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->index(['school_track', 'class_name']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('student_records');
    }
};
