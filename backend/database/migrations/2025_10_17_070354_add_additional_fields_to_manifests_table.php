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
        Schema::table('manifests', function (Blueprint $table) {
            $table->string('contract_number')->nullable()->after('manifest_number');
            $table->string('area_and_phase')->nullable()->after('contract_number');
            $table->string('project_code')->nullable()->after('area_and_phase');
            $table->string('cod_number')->nullable()->after('project_code');
            $table->text('driver_instruction_1')->nullable()->after('status');
            $table->text('driver_instruction_2')->nullable()->after('driver_instruction_1');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('manifests', function (Blueprint $table) {
            $table->dropColumn([
                'contract_number',
                'area_and_phase',
                'project_code',
                'cod_number',
                'driver_instruction_1',
                'driver_instruction_2',
            ]);
        });
    }
};
