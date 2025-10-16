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
        Schema::table('transport_requests', function (Blueprint $table) {
            $table->dropForeign(['load_confirmation_id']);
            $table->dropColumn('load_confirmation_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('transport_requests', function (Blueprint $table) {
            $table->foreignId('load_confirmation_id')->nullable()->constrained('load_confirmations')->nullOnDelete();
        });
    }
};
