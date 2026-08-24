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
        Schema::create('announcements', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('school_id')->constrained()->cascadeOnDelete();
            $table->foreignId('author_id')->constrained('users')->cascadeOnDelete();
            $table->string('title', 180);
            $table->text('body')->nullable();
            $table->timestamps();

            $table->index(['school_id', 'created_at']);
        });

        Schema::create('announcement_attachments', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('announcement_id')->constrained()->cascadeOnDelete();
            $table->string('file_path');
            $table->string('original_name');
            $table->string('mime_type', 120);
            $table->unsignedInteger('size_in_kb')->default(0);
            $table->boolean('is_image')->default(false);
            $table->timestamps();

            $table->index('announcement_id');
        });

        Schema::table('user_notifications', function (Blueprint $table): void {
            $table->foreignId('announcement_id')
                ->nullable()
                ->after('user_id')
                ->constrained()
                ->nullOnDelete();

            $table->index(['announcement_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('user_notifications', function (Blueprint $table): void {
            $table->dropConstrainedForeignId('announcement_id');
        });

        Schema::dropIfExists('announcement_attachments');
        Schema::dropIfExists('announcements');
    }
};
