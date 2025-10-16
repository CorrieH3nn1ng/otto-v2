<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Document extends Model
{
    protected $fillable = [
        'invoice_id',
        'document_type',
        'document_subtype',
        'original_filename',
        'file_path',
        'file_size_bytes',
        'extracted_data',
        'classification_confidence',
        'uploaded_by',
    ];

    protected $casts = [
        'extracted_data' => 'array',
        'classification_confidence' => 'decimal:2',
        'file_size_bytes' => 'integer',
    ];

    public function invoice(): BelongsTo
    {
        return $this->belongsTo(Invoice::class);
    }
}
