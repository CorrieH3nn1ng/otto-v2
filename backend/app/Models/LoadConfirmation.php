<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

class LoadConfirmation extends Model
{
    protected $fillable = [
        'transport_request_id',
        'file_reference',
        'confirmation_date',
        'transporter_id',
        'transporter_name',
        'attention',
        'contact_details',
        'collection_date',
        'currency',
        'vehicle_type',
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
        'status',
        'pdf_generated',
        'email_sent',
        'last_emailed_at',
    ];

    protected $casts = [
        'confirmation_date' => 'date',
        'collection_date' => 'date',
        'straps' => 'boolean',
        'chains' => 'boolean',
        'tarpaulin' => 'boolean',
        'corner_plates' => 'boolean',
        'uprights' => 'boolean',
        'rubber_protection' => 'boolean',
        'pdf_generated' => 'boolean',
        'email_sent' => 'boolean',
        'last_emailed_at' => 'datetime',
    ];

    public function transportRequest(): BelongsTo
    {
        return $this->belongsTo(TransportRequest::class);
    }

    public function transporter(): BelongsTo
    {
        return $this->belongsTo(Transporter::class);
    }

    public function invoices(): BelongsToMany
    {
        return $this->belongsToMany(Invoice::class, 'invoice_load_confirmation')
            ->withTimestamps();
    }

    public function manifests(): HasMany
    {
        return $this->hasMany(Manifest::class);
    }

    public function activities(): HasMany
    {
        return $this->hasMany(LoadConfirmationActivity::class);
    }
}
