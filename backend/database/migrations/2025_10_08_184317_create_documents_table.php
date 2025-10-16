<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('documents', function (Blueprint $table) {
            $table->id();
            $table->foreignId('invoice_id')->nullable()->constrained()->cascadeOnDelete();
            $table->enum('document_type', ['invoice', 'delivery_note', 'packing_list', 'qc_certificate', 'bv_certificate', 'msds', 'other'])->default('other');
            $table->string('document_subtype')->nullable();
            $table->string('original_filename');
            $table->string('file_path');
            $table->bigInteger('file_size_bytes')->nullable();
            $table->json('extracted_data')->nullable();
            $table->decimal('classification_confidence', 3, 2)->nullable(); // 0.00 to 1.00
            $table->foreignId('uploaded_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('documents');
    }
};
