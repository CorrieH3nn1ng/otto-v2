<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PendingDocument extends Model
{
    protected $fillable = [
        'invoice_number',
        'supplier_name',
        'customer_name',
        'total_amount',
        'currency',
        'invoice_date',
        'original_filename',
        'pdf_base64',
        'file_size_bytes',
        'claude_extraction',
        'classified_documents',
        'status',
        'acknowledged_at',
        'acknowledged_by',
        'rejection_reason',
        'invoice_id',
    ];

    protected $casts = [
        'claude_extraction' => 'array',
        'classified_documents' => 'array',
        'total_amount' => 'decimal:2',
        'file_size_bytes' => 'integer',
        'invoice_date' => 'date',
        'acknowledged_at' => 'datetime',
    ];

    public function invoice(): BelongsTo
    {
        return $this->belongsTo(Invoice::class);
    }

    /**
     * Classify documents from Claude extraction
     */
    public function classifyDocuments(array $claudeData): array
    {
        $classified = [];

        // Look for invoice indicators
        if (isset($claudeData['invoice'])) {
            $classified[] = [
                'type' => 'invoice',
                'page' => 1,
                'data' => $claudeData['invoice'],
                'confidence' => 0.95,
            ];
        }

        // Look for delivery note indicators
        if (isset($claudeData['delivery_note']) ||
            (isset($claudeData['invoice']['numbers']) && str_contains($claudeData['invoice']['numbers'], 'DELIVERY'))) {
            $classified[] = [
                'type' => 'delivery_note',
                'page' => 2,
                'data' => $claudeData['delivery_note'] ?? [],
                'confidence' => 0.90,
            ];
        }

        // Look for packing list indicators
        if (isset($claudeData['packing'])) {
            $classified[] = [
                'type' => 'packing_list',
                'pages' => [3, 4],
                'data' => $claudeData['packing'],
                'confidence' => 0.90,
            ];
        }

        return $classified;
    }
}
