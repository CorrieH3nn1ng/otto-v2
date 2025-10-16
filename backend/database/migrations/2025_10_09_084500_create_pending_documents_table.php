<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('pending_documents', function (Blueprint $table) {
            $table->id();

            // Identification
            $table->string('invoice_number')->index();
            $table->string('supplier_name');
            $table->string('customer_name');
            $table->decimal('total_amount', 15, 2);
            $table->string('currency', 3)->default('USD');
            $table->date('invoice_date')->nullable();

            // Original PDF storage
            $table->string('original_filename');
            $table->text('pdf_base64'); // Store the original PDF
            $table->integer('file_size_bytes')->default(0);

            // Full extracted JSON from Claude Vision (all pages, all documents)
            $table->json('claude_extraction'); // Complete raw extraction

            // Document classification results
            $table->json('classified_documents'); // Array of classified document types
            // Format: [
            //   {type: 'invoice', page: 1, data: {...}},
            //   {type: 'delivery_note', page: 2, data: {...}},
            //   {type: 'packing_list', page: 3, data: {...}}
            // ]

            // Status tracking
            $table->enum('status', ['pending_review', 'acknowledged', 'rejected', 'processed'])->default('pending_review');
            $table->timestamp('acknowledged_at')->nullable();
            $table->string('acknowledged_by')->nullable();
            $table->text('rejection_reason')->nullable();

            // Link to final invoice record (after acknowledgment)
            $table->foreignId('invoice_id')->nullable()->constrained('invoices')->onDelete('set null');

            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('pending_documents');
    }
};
