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
        // Check and drop the foreign key if it exists
        $foreignKeys = DB::select("SELECT CONSTRAINT_NAME FROM information_schema.TABLE_CONSTRAINTS WHERE TABLE_NAME = 'invoices' AND CONSTRAINT_NAME = 'invoices_supplier_id_foreign'");
        if (!empty($foreignKeys)) {
            Schema::table('invoices', function (Blueprint $table) {
                $table->dropForeign(['supplier_id']);
            });
        }

        // Check and drop the existing unique constraint if it exists
        $uniqueConstraints = DB::select("SELECT INDEX_NAME FROM information_schema.STATISTICS WHERE TABLE_NAME = 'invoices' AND INDEX_NAME = 'unique_supplier_invoice'");
        if (!empty($uniqueConstraints)) {
            Schema::table('invoices', function (Blueprint $table) {
                $table->dropUnique('unique_supplier_invoice');
            });
        }

        // Add a virtual/generated column that will be NULL for superseded invoices
        // and invoice_number for active invoices
        DB::statement('ALTER TABLE invoices ADD COLUMN active_invoice_number VARCHAR(255) GENERATED ALWAYS AS (IF(is_superseded = 0, invoice_number, NULL)) VIRTUAL');

        // Create unique index on (supplier_id, active_invoice_number)
        // This will only enforce uniqueness for active invoices (where active_invoice_number IS NOT NULL)
        // NULL values don't participate in unique constraints, so superseded invoices won't conflict
        DB::statement('CREATE UNIQUE INDEX unique_active_supplier_invoice ON invoices (supplier_id, active_invoice_number)');

        // Always recreate the foreign key (it was either dropped or didn't exist)
        Schema::table('invoices', function (Blueprint $table) {
            $table->foreign('supplier_id')->references('id')->on('suppliers')->onDelete('cascade');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Drop the foreign key first
        Schema::table('invoices', function (Blueprint $table) {
            $table->dropForeign(['supplier_id']);
        });

        // Drop the unique index
        DB::statement('DROP INDEX unique_active_supplier_invoice ON invoices');

        // Drop the generated column
        DB::statement('ALTER TABLE invoices DROP COLUMN active_invoice_number');

        // Restore the original unique constraint
        Schema::table('invoices', function (Blueprint $table) {
            $table->unique(['supplier_id', 'invoice_number'], 'unique_supplier_invoice');
        });

        // Recreate the foreign key
        Schema::table('invoices', function (Blueprint $table) {
            $table->foreign('supplier_id')->references('id')->on('suppliers')->onDelete('cascade');
        });
    }
};
