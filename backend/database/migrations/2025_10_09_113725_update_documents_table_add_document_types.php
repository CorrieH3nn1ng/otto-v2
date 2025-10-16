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
        // Alter the enum to include tax_invoice, commercial_invoice, and feri_certificate
        DB::statement("ALTER TABLE documents MODIFY COLUMN document_type ENUM('invoice', 'tax_invoice', 'commercial_invoice', 'delivery_note', 'packing_list', 'qc_certificate', 'bv_certificate', 'feri_certificate', 'msds', 'other') NOT NULL DEFAULT 'other'");
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Revert back to original enum
        DB::statement("ALTER TABLE documents MODIFY COLUMN document_type ENUM('invoice', 'delivery_note', 'packing_list', 'qc_certificate', 'bv_certificate', 'msds', 'other') NOT NULL DEFAULT 'other'");
    }
};
