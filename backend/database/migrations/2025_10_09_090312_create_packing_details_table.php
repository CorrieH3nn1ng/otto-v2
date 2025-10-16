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
        Schema::create('packing_details', function (Blueprint $table) {
            $table->id();
            $table->foreignId('invoice_id')->constrained()->onDelete('cascade');
            $table->integer('package_number'); // Package/carton/pallet number
            $table->string('package_type', 50)->nullable(); // e.g., "PALLET", "CARTON", "BOX"
            $table->decimal('length_cm', 10, 2)->nullable();
            $table->decimal('width_cm', 10, 2)->nullable();
            $table->decimal('height_cm', 10, 2)->nullable();
            $table->decimal('cbm', 15, 6)->nullable(); // Cubic meters (calculated or extracted)
            $table->decimal('gross_weight_kg', 15, 3)->nullable();
            $table->decimal('net_weight_kg', 15, 3)->nullable();
            $table->decimal('volumetric_weight_kg', 15, 3)->nullable(); // Used for billing calculations
            $table->text('contents_description')->nullable(); // Description of what's in this package
            $table->json('extracted_data')->nullable(); // Full extracted JSON from Claude Vision
            $table->timestamps();

            $table->index(['invoice_id', 'package_number']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('packing_details');
    }
};
