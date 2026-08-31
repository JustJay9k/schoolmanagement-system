<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('student_performance_records', function (Blueprint $table): void {
            if (! Schema::hasColumn('student_performance_records', 'status')) {
                $table->string('status', 20)
                    ->default('draft')
                    ->after('comment');
            }
        });

        if (DB::getDriverName() === 'sqlite') {
            DB::table('student_performance_records')->update(['status' => 'submitted']);
        } else {
            DB::table('student_performance_records')
                ->whereNull('status')
                ->update(['status' => 'submitted']);
        }
    }

    public function down(): void
    {
        Schema::table('student_performance_records', function (Blueprint $table): void {
            if (Schema::hasColumn('student_performance_records', 'status')) {
                $table->dropColumn('status');
            }
        });
    }
};
