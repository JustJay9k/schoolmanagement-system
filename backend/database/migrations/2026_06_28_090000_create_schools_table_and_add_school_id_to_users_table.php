<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('schools', function (Blueprint $table): void {
            $table->id();
            $table->string('name', 180)->unique();
            $table->timestamps();
        });

        Schema::table('users', function (Blueprint $table): void {
            $table->foreignId('school_id')
                ->nullable()
                ->after('status')
                ->constrained('schools')
                ->nullOnDelete();
        });

        $schoolId = DB::table('schools')->insertGetId([
            'name' => trim((string) config('app.name', 'School Management System')),
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        DB::table('users')->whereNull('school_id')->update([
            'school_id' => $schoolId,
        ]);
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('users', function (Blueprint $table): void {
            $table->dropForeign(['school_id']);
            $table->dropColumn('school_id');
        });

        Schema::dropIfExists('schools');
    }
};
