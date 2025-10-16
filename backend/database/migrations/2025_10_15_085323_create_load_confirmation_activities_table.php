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
        Schema::create('load_confirmation_activities', function (Blueprint $table) {
            $table->id();
            $table->foreignId('load_confirmation_id')->constrained('load_confirmations')->onDelete('cascade');
            $table->string('activity_type')->index();
            $table->string('user_name')->nullable();
            $table->text('description');
            $table->json('metadata')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('load_confirmation_activities');
    }
};
