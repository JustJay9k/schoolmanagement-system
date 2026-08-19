<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('student_records', function (Blueprint $table): void {
            $table->string('guardian_phone', 50)->nullable()->after('guardian_name');
            $table->string('guardian_email')->nullable()->after('guardian_phone');
        });
    }

    public function down(): void
    {
        Schema::table('student_records', function (Blueprint $table): void {
            $table->dropColumn(['guardian_phone', 'guardian_email']);
        });
    }
};
