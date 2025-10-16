<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PackingDetail extends Model
{
    protected $fillable = [
        'invoice_id',
        'package_number',
        'package_type',
        'length_cm',
        'width_cm',
        'height_cm',
        'cbm',
        'gross_weight_kg',
        'net_weight_kg',
        'volumetric_weight_kg',
        'contents_description',
        'file_name',
        'extracted_data',
    ];

    protected $casts = [
        'length_cm' => 'decimal:2',
        'width_cm' => 'decimal:2',
        'height_cm' => 'decimal:2',
        'cbm' => 'decimal:6',
        'gross_weight_kg' => 'decimal:3',
        'net_weight_kg' => 'decimal:3',
        'volumetric_weight_kg' => 'decimal:3',
        'extracted_data' => 'array',
    ];

    public function invoice(): BelongsTo
    {
        return $this->belongsTo(Invoice::class);
    }
}
