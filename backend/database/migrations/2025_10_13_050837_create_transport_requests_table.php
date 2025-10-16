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
        Schema::create('transport_requests', function (Blueprint $table) {
            $table->id();

            // Request information (filled by Key Account Manager)
            $table->string('request_reference')->unique();
            $table->date('requested_collection_date');
            $table->string('collection_address')->nullable();
            $table->string('collection_address_2')->nullable();
            $table->string('delivery_address')->nullable();
            $table->text('commodity_description')->nullable();
            $table->text('special_requirements')->nullable();

            // Equipment requirements
            $table->boolean('straps')->default(false);
            $table->boolean('chains')->default(false);
            $table->boolean('tarpaulin')->default(false);
            $table->boolean('corner_plates')->default(false);
            $table->boolean('uprights')->default(false);
            $table->boolean('rubber_protection')->default(false);

            // Status tracking
            $table->enum('status', ['pending', 'assigned', 'rejected', 'completed'])->default('pending');

            // Transport Planner assignment (filled by Transport Planner)
            $table->foreignId('transporter_id')->nullable()->constrained('transporters')->nullOnDelete();
            $table->string('transporter_name')->nullable();
            $table->string('vehicle_type')->nullable();
            $table->string('truck_registration')->nullable();
            $table->string('trailer_1_registration')->nullable();
            $table->string('trailer_2_registration')->nullable();
            $table->string('driver_name')->nullable();
            $table->string('driver_contact')->nullable();
            $table->text('planner_notes')->nullable();

            // Related entities
            $table->foreignId('load_confirmation_id')->nullable()->constrained('load_confirmations')->nullOnDelete();

            $table->timestamps();
        });

        // Pivot table for invoices linked to transport requests
        Schema::create('invoice_transport_request', function (Blueprint $table) {
            $table->id();
            $table->foreignId('invoice_id')->constrained('invoices')->cascadeOnDelete();
            $table->foreignId('transport_request_id')->constrained('transport_requests')->cascadeOnDelete();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('invoice_transport_request');
        Schema::dropIfExists('transport_requests');
    }
};
