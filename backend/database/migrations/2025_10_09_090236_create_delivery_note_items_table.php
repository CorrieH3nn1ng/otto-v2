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
        Schema::create('delivery_note_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('invoice_id')->constrained()->onDelete('cascade');
            $table->foreignId('invoice_line_item_id')->nullable()->constrained('invoice_line_items')->onDelete('set null'); // Link to parent kit item if applicable
            $table->integer('line_number');
            $table->string('item_code')->nullable();
            $table->text('description');
            $table->decimal('quantity_shipped', 15, 3);
            $table->string('unit_of_measure', 50)->nullable();
            $table->string('serial_number', 100)->nullable();
            $table->string('batch_number', 100)->nullable();
            $table->json('extracted_data')->nullable(); // Full extracted JSON from Claude Vision
            $table->timestamps();

            $table->index(['invoice_id', 'line_number']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('delivery_note_items');
    }
};
