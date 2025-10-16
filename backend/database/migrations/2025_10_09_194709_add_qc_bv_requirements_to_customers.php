<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('customers', function (Blueprint $table) {
            $table->boolean('requires_qc')->default(false)->after('phone');
            $table->text('qc_notes')->nullable()->after('requires_qc');
        });

        // Set QC requirement for specific customers: KAMOA, ALPHAMIN, KIPUSHI
        DB::statement("UPDATE customers SET requires_qc = 1 WHERE name LIKE '%KAMOA%' OR name LIKE '%ALPHAMIN%' OR name LIKE '%KIPUSHI%'");
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('customers', function (Blueprint $table) {
            $table->dropColumn(['requires_qc', 'qc_notes']);
        });
    }
};
