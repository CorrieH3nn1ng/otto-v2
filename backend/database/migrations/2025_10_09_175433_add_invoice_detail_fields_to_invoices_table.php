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
        Schema::table('invoices', function (Blueprint $table) {
            $table->string('payment_terms')->nullable()->after('incoterms');
            $table->string('delivery_method')->nullable()->after('payment_terms');
            $table->text('delivery_address')->nullable()->after('delivery_method');
            $table->text('supplier_address')->nullable()->after('delivery_address');
            $table->string('supplier_contact')->nullable()->after('supplier_address');
            $table->string('supplier_email')->nullable()->after('supplier_contact');
            $table->string('exporter_code')->nullable()->after('supplier_email');
            $table->string('hs_code')->nullable()->after('exporter_code');
            $table->string('country_of_origin')->nullable()->after('hs_code');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('invoices', function (Blueprint $table) {
            $table->dropColumn([
                'payment_terms',
                'delivery_method',
                'delivery_address',
                'supplier_address',
                'supplier_contact',
                'supplier_email',
                'exporter_code',
                'hs_code',
                'country_of_origin'
            ]);
        });
    }
};
