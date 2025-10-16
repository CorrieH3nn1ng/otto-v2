<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class InvoiceLineItem extends Model
{
    protected $fillable = [
        'invoice_id',
        'line_number',
        'item_code',
        'description',
        'quantity',
        'unit_of_measure',
        'unit_price',
        'line_total',
        'hs_code',
        'country_of_origin',
        'is_kit_item',
        'extracted_data',
    ];

    protected $casts = [
        'quantity' => 'decimal:3',
        'unit_price' => 'decimal:4',
        'line_total' => 'decimal:2',
        'is_kit_item' => 'boolean',
        'extracted_data' => 'array',
    ];

    public function invoice(): BelongsTo
    {
        return $this->belongsTo(Invoice::class);
    }

    public function deliveryNoteItems(): HasMany
    {
        return $this->hasMany(DeliveryNoteItem::class);
    }
}
