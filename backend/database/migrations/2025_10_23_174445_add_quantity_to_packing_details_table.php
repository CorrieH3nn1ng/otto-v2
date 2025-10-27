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
            // Add quantity field to support grouped packages
            // Allows grouping identical packages (same type, dimensions, weight, description, file_name)
            $table->integer('quantity')->default(1)->after('package_number');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('packing_details', function (Blueprint $table) {
            $table->dropColumn('quantity');
        });
    }
};
