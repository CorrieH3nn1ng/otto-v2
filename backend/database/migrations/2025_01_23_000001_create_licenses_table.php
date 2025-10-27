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
        Schema::create('licenses', function (Blueprint $table) {
            $table->id();

            // License identification
            $table->string('declaration_number')->unique();
            $table->string('validation_number')->nullable();

            // Bank and approval details
            $table->string('bank_name')->nullable();
            $table->string('bank_branch')->nullable();
            $table->date('validation_date')->nullable();
            $table->date('expiry_date')->nullable();
            $table->string('category')->nullable(); // e.g., LICENCE PREFINANCEE

            // Link to Purchase Order
            $table->foreignId('purchase_order_id')
                  ->constrained('invoices')
                  ->onDelete('cascade');

            // Importer details (usually matches customer)
            $table->string('importer_name')->nullable();
            $table->string('importer_tax_number')->nullable();

            // Supplier details
            $table->string('supplier_name')->nullable();
            $table->string('country_of_origin')->nullable();

            // Financial details
            $table->decimal('total_amount', 15, 2)->nullable();
            $table->string('currency', 3)->default('ZAR');

            // Referenced invoice from license (not our invoice, but the invoice mentioned in the license)
            $table->string('invoice_number')->nullable();
            $table->date('invoice_date')->nullable();

            // Customs and transport
            $table->string('customs_entry_point')->nullable();
            $table->string('transport_mode')->nullable();

            // Additional metadata
            $table->string('original_filename')->nullable();

            $table->timestamps();

            // Indexes
            $table->index('purchase_order_id');
            $table->index('declaration_number');
            $table->index('validation_date');
            $table->index('expiry_date');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('licenses');
    }
};
