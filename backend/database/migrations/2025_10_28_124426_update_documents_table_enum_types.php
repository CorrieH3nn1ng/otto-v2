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
        // First, convert old document types that are being removed to 'other'
        DB::statement("UPDATE documents SET document_type = 'other' WHERE document_type IN ('delivery_note', 'qc_certificate', 'bv_certificate', 'msds', 'purchase_order', 'license')");

        // Update the document_type enum to reflect actual business requirements
        DB::statement("ALTER TABLE documents MODIFY COLUMN document_type ENUM(
            'invoice',
            'packing_list',
            'bv_report',
            'freight_statement',
            'validated_feri',
            'insurance',
            'manifest',
            'other'
        ) DEFAULT 'other'");
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Revert to original enum values
        DB::statement("ALTER TABLE documents MODIFY COLUMN document_type ENUM(
            'invoice',
            'delivery_note',
            'packing_list',
            'qc_certificate',
            'bv_certificate',
            'msds',
            'purchase_order',
            'license',
            'other'
        ) DEFAULT 'other'");
    }
};
