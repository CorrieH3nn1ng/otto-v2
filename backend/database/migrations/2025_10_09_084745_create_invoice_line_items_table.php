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
        Schema::create('invoice_line_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('invoice_id')->constrained()->onDelete('cascade');
            $table->integer('line_number');
            $table->string('item_code')->nullable();
            $table->text('description');
            $table->decimal('quantity', 15, 3);
            $table->string('unit_of_measure', 50)->nullable(); // e.g., "PCS", "KG", "M"
            $table->decimal('unit_price', 15, 4);
            $table->decimal('line_total', 15, 2);
            $table->string('hs_code', 20)->nullable(); // Harmonized System code for customs
            $table->string('country_of_origin', 100)->nullable();
            $table->boolean('is_kit_item')->default(false); // True if this line item is a kit/bundle
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
        Schema::dropIfExists('invoice_line_items');
    }
};
