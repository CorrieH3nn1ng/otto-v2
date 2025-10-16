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
        Schema::table('load_confirmations', function (Blueprint $table) {
            $table->foreignId('transport_request_id')->nullable()->after('id')->constrained('transport_requests')->nullOnDelete();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('load_confirmations', function (Blueprint $table) {
            $table->dropForeign(['transport_request_id']);
            $table->dropColumn('transport_request_id');
        });
    }
};
