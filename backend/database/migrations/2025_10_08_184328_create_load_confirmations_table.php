<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('load_confirmations', function (Blueprint $table) {
            $table->id();
            $table->string('reference_number')->unique();
            $table->foreignId('transporter_id')->nullable()->constrained()->nullOnDelete();
            $table->date('pickup_date')->nullable();
            $table->date('delivery_date')->nullable();
            $table->string('vehicle_type')->nullable();
            $table->string('driver_name')->nullable();
            $table->string('driver_phone')->nullable();
            $table->enum('status', ['draft', 'pending_transport', 'transport_confirmed', 'ready_for_manifest', 'in_manifest'])->default('draft');
            $table->timestamps();
        });
        
        // Pivot table for invoices and load confirmations
        Schema::create('invoice_load_confirmation', function (Blueprint $table) {
            $table->id();
            $table->foreignId('invoice_id')->constrained()->cascadeOnDelete();
            $table->foreignId('load_confirmation_id')->constrained()->cascadeOnDelete();
            $table->timestamp('added_at')->useCurrent();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('invoice_load_confirmation');
        Schema::dropIfExists('load_confirmations');
    }
};
