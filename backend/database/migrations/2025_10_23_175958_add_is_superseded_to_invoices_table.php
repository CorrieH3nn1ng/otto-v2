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
            // Track if this invoice has been replaced by a newer version
            $table->boolean('is_superseded')->default(false)->after('status');
            // Reference to the invoice that superseded this one
            $table->bigInteger('superseded_by_invoice_id')->unsigned()->nullable()->after('is_superseded');
            $table->timestamp('superseded_at')->nullable()->after('superseded_by_invoice_id');

            $table->foreign('superseded_by_invoice_id')->references('id')->on('invoices')->onDelete('set null');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('invoices', function (Blueprint $table) {
            $table->dropForeign(['superseded_by_invoice_id']);
            $table->dropColumn(['is_superseded', 'superseded_by_invoice_id', 'superseded_at']);
        });
    }
};
