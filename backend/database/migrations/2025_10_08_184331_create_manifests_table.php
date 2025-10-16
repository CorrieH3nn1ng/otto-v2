<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('manifests', function (Blueprint $table) {
            $table->id();
            $table->string('manifest_number')->unique();
            $table->foreignId('load_confirmation_id')->nullable()->constrained()->nullOnDelete();
            $table->date('export_date')->nullable();
            $table->enum('customs_status', ['pending', 'in_progress', 'cleared', 'rejected'])->default('pending');
            $table->date('feri_application_date')->nullable();
            $table->date('certificate_of_destination_date')->nullable();
            $table->enum('status', ['draft', 'pending_feri', 'feri_approved', 'in_transit', 'delivered', 'completed'])->default('draft');
            $table->timestamps();
        });
        
        // Pivot table for invoices and manifests
        Schema::create('invoice_manifest', function (Blueprint $table) {
            $table->id();
            $table->foreignId('invoice_id')->constrained()->cascadeOnDelete();
            $table->foreignId('manifest_id')->constrained()->cascadeOnDelete();
            $table->timestamp('added_at')->useCurrent();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('invoice_manifest');
        Schema::dropIfExists('manifests');
    }
};
