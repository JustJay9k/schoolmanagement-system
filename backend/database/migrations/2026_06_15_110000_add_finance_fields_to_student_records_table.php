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
            $table->decimal('fees_balance', 12, 2)->default(0)->after('first_entry_date');
            $table->boolean('books_paid')->default(false)->after('fees_balance');
            $table->boolean('uniform_paid')->default(false)->after('books_paid');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('student_records', function (Blueprint $table): void {
            $table->dropColumn([
                'fees_balance',
                'books_paid',
                'uniform_paid',
            ]);
        });
    }
};
