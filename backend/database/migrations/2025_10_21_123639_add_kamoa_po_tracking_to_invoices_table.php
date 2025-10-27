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
            // Invoice Type - distinguish PO, Proforma, Commercial Invoice
            $table->enum('invoice_type', ['purchase_order', 'proforma_invoice', 'commercial_invoice'])
                ->default('commercial_invoice')
                ->after('invoice_number');

            // Parent Invoice Linking (PO -> Proforma -> Invoice chain)
            $table->unsignedBigInteger('parent_invoice_id')->nullable()->after('id');
            $table->foreign('parent_invoice_id')->references('id')->on('invoices')->onDelete('set null');

            // KAMOA-Specific Reference Fields
            $table->string('customer_reference')->nullable()->after('purchase_order');
            $table->string('rfq_number')->nullable()->after('customer_reference');
            $table->string('internal_reference')->nullable()->after('rfq_number');
            $table->string('end_user')->nullable()->after('internal_reference');
            $table->string('customer_account_code', 50)->nullable()->after('customer_id');
            $table->string('tax_reference_number', 100)->nullable()->after('exporter_code');
            $table->string('import_export_number', 100)->nullable()->after('tax_reference_number');
            $table->string('customs_declaration_number', 100)->nullable()->after('import_export_number');

            // Budget Tracking (Fund Usage)
            $table->decimal('po_budget_amount', 15, 2)->nullable()->after('total_amount');
            $table->decimal('budget_variance', 15, 2)->nullable()->after('po_budget_amount');
            $table->decimal('budget_variance_percentage', 10, 4)->nullable()->after('budget_variance');

            // Weight Tracking
            $table->decimal('expected_weight_kg', 10, 2)->nullable()->after('hs_code');
            $table->decimal('actual_weight_kg', 10, 2)->nullable()->after('expected_weight_kg');
            $table->decimal('weight_variance_kg', 10, 2)->nullable()->after('actual_weight_kg');

            // Exchange Rate Tracking (for multi-currency and vehicle allocation)
            $table->decimal('exchange_rate', 12, 6)->nullable()->after('currency');
            $table->date('exchange_rate_date')->nullable()->after('exchange_rate');
            $table->string('exchange_rate_source', 50)->default('manual')->after('exchange_rate_date');
            $table->decimal('rate_variance_from_parent', 10, 4)->nullable()->after('exchange_rate_source');

            // Indexes for performance
            $table->index('invoice_type');
            $table->index('parent_invoice_id');
            $table->index('customer_reference');
            $table->index('customer_account_code');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('invoices', function (Blueprint $table) {
            // Drop indexes first
            $table->dropIndex(['invoice_type']);
            $table->dropIndex(['parent_invoice_id']);
            $table->dropIndex(['customer_reference']);
            $table->dropIndex(['customer_account_code']);

            // Drop foreign key
            $table->dropForeign(['parent_invoice_id']);

            // Drop columns
            $table->dropColumn([
                'invoice_type',
                'parent_invoice_id',
                'customer_reference',
                'rfq_number',
                'internal_reference',
                'end_user',
                'customer_account_code',
                'tax_reference_number',
                'import_export_number',
                'customs_declaration_number',
                'po_budget_amount',
                'budget_variance',
                'budget_variance_percentage',
                'expected_weight_kg',
                'actual_weight_kg',
                'weight_variance_kg',
                'exchange_rate',
                'exchange_rate_date',
                'exchange_rate_source',
                'rate_variance_from_parent',
            ]);
        });
    }
};
