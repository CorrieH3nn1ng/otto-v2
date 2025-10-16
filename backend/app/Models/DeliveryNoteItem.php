<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class DeliveryNoteItem extends Model
{
    protected $fillable = [
        'invoice_id',
        'invoice_line_item_id',
        'line_number',
        'item_code',
        'description',
        'quantity_shipped',
        'unit_of_measure',
        'serial_number',
        'batch_number',
        'extracted_data',
    ];

    protected $casts = [
        'quantity_shipped' => 'decimal:3',
        'extracted_data' => 'array',
    ];

    public function invoice(): BelongsTo
    {
        return $this->belongsTo(Invoice::class);
    }

    public function invoiceLineItem(): BelongsTo
    {
        return $this->belongsTo(InvoiceLineItem::class);
    }
}
