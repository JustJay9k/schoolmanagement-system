<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        $structureSettings = DB::table('school_settings')
            ->where('key', 'school_structure')
            ->get();
        $schoolIds = DB::table('schools')->orderBy('id')->pluck('id')->values();

        Schema::table('school_settings', function (Blueprint $table): void {
            $table->foreignId('school_id')
                ->nullable()
                ->after('id')
                ->constrained()
                ->cascadeOnDelete();
        });

        Schema::table('school_settings', function (Blueprint $table): void {
            $table->dropUnique('school_settings_key_unique');
            $table->unique(['school_id', 'key'], 'school_settings_school_key_unique');
        });

        if ($structureSettings->isEmpty() || $schoolIds->isEmpty()) {
            return;
        }

        $firstSchoolId = $schoolIds->first();

        foreach ($structureSettings as $setting) {
            DB::table('school_settings')
                ->where('id', $setting->id)
                ->update(['school_id' => $firstSchoolId]);

            foreach ($schoolIds->skip(1) as $schoolId) {
                DB::table('school_settings')->insert([
                    'school_id' => $schoolId,
                    'key' => $setting->key,
                    'value' => $setting->value,
                    'created_at' => $setting->created_at,
                    'updated_at' => $setting->updated_at,
                ]);
            }
        }
    }

    public function down(): void
    {
        $settingsToKeep = DB::table('school_settings')
            ->selectRaw('MIN(id) as id')
            ->groupBy('key')
            ->pluck('id');

        DB::table('school_settings')
            ->whereNotIn('id', $settingsToKeep)
            ->delete();

        DB::table('school_settings')->update(['school_id' => null]);

        Schema::table('school_settings', function (Blueprint $table): void {
            $table->dropUnique('school_settings_school_key_unique');
            $table->dropConstrainedForeignId('school_id');
            $table->unique('key', 'school_settings_key_unique');
        });
    }
};
