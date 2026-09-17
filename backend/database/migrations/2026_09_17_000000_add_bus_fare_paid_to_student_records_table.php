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
        Schema::table('student_records', function (Blueprint $table): void {
            $table->boolean('bus_fare_paid')->default(false)->after('uniform_paid');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('student_records', function (Blueprint $table): void {
            $table->dropColumn('bus_fare_paid');
        });
    }
};
