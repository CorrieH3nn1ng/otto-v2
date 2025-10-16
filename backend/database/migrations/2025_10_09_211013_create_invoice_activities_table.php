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
        Schema::create('invoice_activities', function (Blueprint $table) {
            $table->id();
            $table->foreignId('invoice_id')->constrained('invoices')->onDelete('cascade');
            $table->string('activity_type'); // 'qc_update', 'bv_update', 'document_upload', 'status_change', 'note_added', etc.
            $table->string('user_name')->nullable(); // For now just store the name, later can add user_id
            $table->text('description'); // Human-readable description of what happened
            $table->json('metadata')->nullable(); // Additional data (old_value, new_value, document_name, etc.)
            $table->timestamps();

            // Index for faster queries
            $table->index('invoice_id');
            $table->index('activity_type');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('invoice_activities');
    }
};
