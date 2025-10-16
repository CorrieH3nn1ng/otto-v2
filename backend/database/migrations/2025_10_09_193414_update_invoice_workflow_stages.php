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
        // Update current_stage enum to include invoice-level workflow stages
        DB::statement("ALTER TABLE invoices MODIFY current_stage ENUM(
            'receiving',
            'doc_verify',
            'qc_inspection',
            'bv_inspection',
            'ready_dispatch',
            'invoice_received',
            'awaiting_qc',
            'awaiting_bv',
            'ready_for_transport',
            'transport_requested',
            'in_transit',
            'delivered'
        ) DEFAULT 'receiving'");

        // Add workflow tracking columns
        Schema::table('invoices', function (Blueprint $table) {
            $table->timestamp('receiving_completed_at')->nullable()->after('updated_at');
            $table->timestamp('doc_verify_completed_at')->nullable()->after('receiving_completed_at');
            $table->timestamp('qc_inspection_completed_at')->nullable()->after('doc_verify_completed_at');
            $table->timestamp('bv_inspection_completed_at')->nullable()->after('qc_inspection_completed_at');
            $table->timestamp('ready_dispatch_at')->nullable()->after('bv_inspection_completed_at');
            $table->text('workflow_notes')->nullable()->after('ready_dispatch_at');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('invoices', function (Blueprint $table) {
            $table->dropColumn([
                'receiving_completed_at',
                'doc_verify_completed_at',
                'qc_inspection_completed_at',
                'bv_inspection_completed_at',
                'ready_dispatch_at',
                'workflow_notes'
            ]);
        });

        // Revert to original enum
        DB::statement("ALTER TABLE invoices MODIFY current_stage ENUM(
            'invoice_received',
            'awaiting_qc',
            'awaiting_bv',
            'ready_for_transport',
            'transport_requested',
            'in_transit',
            'delivered'
        ) DEFAULT 'invoice_received'");
    }
};
