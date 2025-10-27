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
        Schema::create('vehicles', function (Blueprint $table) {
            $table->id();
            $table->string('horse_reg', 20)->index(); // Truck registration
            $table->string('trailer_reg', 20)->nullable(); // Trailer 1
            $table->string('trailer_reg_1', 10)->nullable(); // Trailer 2
            $table->string('transporter', 45); // Transporter name
            $table->string('truck_type', 45); // SUPERLINK, TRI-AXLE, etc.
            $table->timestamps();

            // Index for fast lookups by registration
            $table->index(['horse_reg', 'transporter']);
            $table->index('trailer_reg');
            $table->index('trailer_reg_1');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('vehicles');
    }
};
