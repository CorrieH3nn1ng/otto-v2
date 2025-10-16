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
        Schema::table('packing_details', function (Blueprint $table) {
            $table->string('file_name')->nullable()->after('contents_description');
            $table->index('file_name'); // Index for faster lookups when validating
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('packing_details', function (Blueprint $table) {
            $table->dropIndex(['file_name']);
            $table->dropColumn('file_name');
        });
    }
};
