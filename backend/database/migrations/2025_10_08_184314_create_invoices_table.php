<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('invoices', function (Blueprint $table) {
            $table->id();
            $table->string('invoice_number')->unique();
            $table->date('invoice_date')->nullable();
            $table->foreignId('supplier_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('customer_id')->nullable()->constrained()->nullOnDelete();
            $table->decimal('total_amount', 12, 2)->nullable();
            $table->string('currency', 3)->default('USD');
            $table->string('purchase_order')->nullable();
            $table->string('incoterms')->nullable();
            $table->enum('status', ['draft', 'pending_approval', 'approved', 'in_transit', 'delivered', 'archived'])->default('draft');
            $table->enum('qc_status', ['not_required', 'pending', 'approved', 'rejected'])->default('not_required');
            $table->enum('bv_status', ['not_required', 'pending', 'approved', 'rejected'])->default('not_required');
            $table->json('extracted_data')->nullable(); // Raw data from Claude Vision
            $table->timestamps();
            $table->softDeletes();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('invoices');
    }
};
