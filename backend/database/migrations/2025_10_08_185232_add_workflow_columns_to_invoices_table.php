<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('invoices', function (Blueprint $table) {
            // Workflow ownership and stage tracking (like old Otto)
            $table->enum('current_owner', [
                'key_accounts_manager',
                'transport_planner',
                'operations',
                'feri_department',
                'finance'
            ])->default('key_accounts_manager')->after('status');
            
            $table->enum('current_stage', [
                'invoice_received',
                'documents_pending',
                'ready_for_transport',
                'transport_arranged',
                'ready_for_manifest',
                'manifest_created',
                'feri_pending',
                'in_transit',
                'delivered',
                'archived'
            ])->default('invoice_received')->after('current_owner');
            
            // Blocking flags
            $table->boolean('can_proceed_to_transport')->default(false)->after('current_stage');
            $table->boolean('blocked_waiting_for_documents')->default(true)->after('can_proceed_to_transport');
            $table->boolean('blocked_waiting_for_transport_planner')->default(false)->after('blocked_waiting_for_documents');
            
            // QC/BV requirements (like old Otto)
            $table->boolean('requires_qc')->default(false)->after('qc_status');
            $table->boolean('requires_bv')->default(false)->after('bv_status');
            $table->boolean('requires_feri')->default(false)->after('requires_bv');
            $table->boolean('has_qc_certificate')->default(false)->after('requires_qc');
            $table->boolean('has_bv_certificate')->default(false)->after('requires_bv');
            $table->boolean('has_feri_certificate')->default(false)->after('requires_feri');
        });
    }

    public function down(): void
    {
        Schema::table('invoices', function (Blueprint $table) {
            $table->dropColumn([
                'current_owner',
                'current_stage',
                'can_proceed_to_transport',
                'blocked_waiting_for_documents',
                'blocked_waiting_for_transport_planner',
                'requires_qc',
                'requires_bv',
                'requires_feri',
                'has_qc_certificate',
                'has_bv_certificate',
                'has_feri_certificate',
            ]);
        });
    }
};
