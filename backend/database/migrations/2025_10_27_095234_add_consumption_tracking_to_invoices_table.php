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
        Schema::table('invoices', function (Blueprint $table) {
            // Consumption tracking fields for special project POs (tons-based)
            $table->decimal('ordered_quantity_tons', 15, 3)->nullable()->after('po_budget_amount')
                ->comment('For special project POs: Total quantity ordered in tons');

            $table->boolean('track_consumption')->default(false)->after('ordered_quantity_tons')
                ->comment('Enable consumption tracking for special project POs');

            $table->string('tracked_item_code')->nullable()->after('track_consumption')
                ->comment('Item code to track consumption for (e.g., ALTSPRAY100)');

            $table->string('tracked_supplier_code')->nullable()->after('tracked_item_code')
                ->comment('Supplier code for consumption tracking');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('invoices', function (Blueprint $table) {
            $table->dropColumn([
                'ordered_quantity_tons',
                'track_consumption',
                'tracked_item_code',
                'tracked_supplier_code',
            ]);
        });
    }
};
