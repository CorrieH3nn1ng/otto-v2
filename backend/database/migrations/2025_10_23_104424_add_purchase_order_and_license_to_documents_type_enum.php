<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        // Modify the document_type enum to include purchase_order and license
        DB::statement("ALTER TABLE documents MODIFY COLUMN document_type ENUM('invoice', 'delivery_note', 'packing_list', 'qc_certificate', 'bv_certificate', 'msds', 'purchase_order', 'license', 'other') DEFAULT 'other'");
    }

    public function down(): void
    {
        // Revert back to original enum values
        DB::statement("ALTER TABLE documents MODIFY COLUMN document_type ENUM('invoice', 'delivery_note', 'packing_list', 'qc_certificate', 'bv_certificate', 'msds', 'other') DEFAULT 'other'");
    }
};
