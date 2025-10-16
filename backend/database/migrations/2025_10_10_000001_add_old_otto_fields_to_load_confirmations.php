<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('load_confirmations', function (Blueprint $table) {
            // Rename reference_number to file_reference to match old OTTO
            $table->renameColumn('reference_number', 'file_reference');

            // Add confirmation_date (replaces pickup_date concept)
            $table->date('confirmation_date')->nullable()->after('file_reference');

            // Rename pickup_date to collection_date
            $table->renameColumn('pickup_date', 'collection_date');

            // Remove delivery_date as it's not in old OTTO
            $table->dropColumn('delivery_date');

            // Add transporter information fields
            $table->string('transporter_name')->nullable()->after('transporter_id');
            $table->string('attention')->nullable()->after('transporter_name');
            $table->string('contact_details')->nullable()->after('attention');

            // Vehicle and registration fields
            $table->string('truck_registration')->nullable()->after('vehicle_type');
            $table->string('trailer_1_registration')->nullable()->after('truck_registration');
            $table->string('trailer_2_registration')->nullable()->after('trailer_1_registration');

            // Border agents
            $table->string('clearing_agent')->nullable()->after('trailer_2_registration');
            $table->string('entry_agent')->nullable()->after('clearing_agent');

            // Addresses (text fields for multi-line addresses)
            $table->text('collection_address')->nullable()->after('entry_agent');
            $table->text('collection_address_2')->nullable()->after('collection_address');
            $table->text('delivery_address')->nullable()->after('collection_address_2');

            // Commodity information
            $table->text('commodity_description')->nullable()->after('delivery_address');
            $table->text('contact_for_nucleus_drc')->nullable()->after('commodity_description');

            // Special instructions (checkboxes)
            $table->boolean('straps')->default(false)->after('contact_for_nucleus_drc');
            $table->boolean('chains')->default(false)->after('straps');
            $table->boolean('tarpaulin')->default(false)->after('chains');
            $table->boolean('corner_plates')->default(false)->after('tarpaulin');
            $table->boolean('uprights')->default(false)->after('corner_plates');
            $table->boolean('rubber_protection')->default(false)->after('uprights');

            // PDF and email tracking
            $table->boolean('pdf_generated')->default(false)->after('status');
            $table->boolean('email_sent')->default(false)->after('pdf_generated');
            $table->timestamp('last_emailed_at')->nullable()->after('email_sent');

            // Remove driver fields - not in old OTTO structure
            $table->dropColumn(['driver_name', 'driver_phone']);
        });
    }

    public function down(): void
    {
        Schema::table('load_confirmations', function (Blueprint $table) {
            // Reverse all changes
            $table->renameColumn('file_reference', 'reference_number');
            $table->dropColumn('confirmation_date');
            $table->renameColumn('collection_date', 'pickup_date');
            $table->date('delivery_date')->nullable();

            $table->dropColumn([
                'transporter_name',
                'attention',
                'contact_details',
                'truck_registration',
                'trailer_1_registration',
                'trailer_2_registration',
                'clearing_agent',
                'entry_agent',
                'collection_address',
                'collection_address_2',
                'delivery_address',
                'commodity_description',
                'contact_for_nucleus_drc',
                'straps',
                'chains',
                'tarpaulin',
                'corner_plates',
                'uprights',
                'rubber_protection',
                'pdf_generated',
                'email_sent',
                'last_emailed_at',
            ]);

            $table->string('driver_name')->nullable();
            $table->string('driver_phone')->nullable();
        });
    }
};
