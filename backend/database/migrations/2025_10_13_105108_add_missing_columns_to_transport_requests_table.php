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
            $table->string('file_ref')->nullable()->after('request_reference');
            $table->string('currency', 3)->default('ZAR')->after('requested_collection_date');
            $table->foreignId('load_confirmation_id')->nullable()->after('planner_notes')->constrained('load_confirmations')->nullOnDelete();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('transport_requests', function (Blueprint $table) {
            $table->dropForeign(['load_confirmation_id']);
            $table->dropColumn(['file_ref', 'currency', 'load_confirmation_id']);
        });
    }
};
