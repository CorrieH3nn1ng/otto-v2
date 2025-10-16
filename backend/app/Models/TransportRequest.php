<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class TransportRequest extends Model
{
    use HasFactory;

    protected $fillable = [
        'request_reference',
        'file_ref',
        'currency',
        'requested_collection_date',
        'collection_address',
        'collection_address_2',
        'delivery_address',
        'commodity_description',
        'special_requirements',
        'straps',
        'chains',
        'tarpaulin',
        'corner_plates',
        'uprights',
        'rubber_protection',
        'status',
        'transporter_id',
        'transporter_name',
        'vehicle_type',
        'truck_registration',
        'trailer_1_registration',
        'trailer_2_registration',
        'driver_name',
        'driver_contact',
        'planner_notes',
    ];

    protected $casts = [
        'requested_collection_date' => 'date',
        'straps' => 'boolean',
        'chains' => 'boolean',
        'tarpaulin' => 'boolean',
        'corner_plates' => 'boolean',
        'uprights' => 'boolean',
        'rubber_protection' => 'boolean',
    ];

    /**
     * Get the transporter assigned to this transport request
     */
    public function transporter(): BelongsTo
    {
        return $this->belongsTo(Transporter::class);
    }

    /**
     * Get the invoices associated with this transport request
     */
    public function invoices(): BelongsToMany
    {
        return $this->belongsToMany(Invoice::class, 'invoice_transport_request')
            ->withTimestamps();
    }

    /**
     * Get the load confirmation created from this transport request
     */
    public function loadConfirmation(): HasOne
    {
        return $this->hasOne(LoadConfirmation::class);
    }

    /**
     * Scope for pending transport requests
     */
    public function scopePending($query)
    {
        return $query->where('status', 'pending');
    }

    /**
     * Scope for assigned transport requests
     */
    public function scopeAssigned($query)
    {
        return $query->where('status', 'assigned');
    }

    /**
     * Check if transport request can be assigned
     */
    public function canBeAssigned(): bool
    {
        return $this->status === 'pending';
    }

    /**
     * Generate a unique request reference
     */
    public static function generateRequestReference(): string
    {
        $prefix = 'TR';
        $date = now()->format('Ymd');
        $lastRequest = self::whereDate('created_at', today())
            ->orderBy('id', 'desc')
            ->first();

        if ($lastRequest) {
            $lastNumber = (int) substr($lastRequest->request_reference, -4);
            $newNumber = str_pad($lastNumber + 1, 4, '0', STR_PAD_LEFT);
        } else {
            $newNumber = '0001';
        }

        return "{$prefix}{$date}{$newNumber}";
    }
}
