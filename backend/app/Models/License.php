<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class License extends Model
{
    use HasFactory;

    protected $fillable = [
        'declaration_number',
        'validation_number',
        'bank_name',
        'bank_branch',
        'validation_date',
        'expiry_date',
        'category',
        'purchase_order_id',
        'importer_name',
        'importer_tax_number',
        'supplier_name',
        'country_of_origin',
        'total_amount',
        'currency',
        'invoice_number',
        'invoice_date',
        'customs_entry_point',
        'transport_mode',
        'original_filename',
    ];

    protected $casts = [
        'validation_date' => 'date',
        'expiry_date' => 'date',
        'invoice_date' => 'date',
        'total_amount' => 'decimal:2',
    ];

    /**
     * Get the purchase order that owns this license.
     */
    public function purchaseOrder(): BelongsTo
    {
        return $this->belongsTo(Invoice::class, 'purchase_order_id');
    }

    /**
     * Get days until license expires
     */
    public function getDaysUntilExpiry(): ?int
    {
        if (!$this->expiry_date) {
            return null;
        }

        return now()->diffInDays($this->expiry_date, false);
    }

    /**
     * Check if license is expiring soon (within 30 days)
     */
    public function isExpiringSoon(): bool
    {
        $days = $this->getDaysUntilExpiry();

        if ($days === null) {
            return false;
        }

        return $days <= 30 && $days > 0;
    }

    /**
     * Check if license has expired
     */
    public function isExpired(): bool
    {
        $days = $this->getDaysUntilExpiry();

        if ($days === null) {
            return false;
        }

        return $days < 0;
    }

    /**
     * Get expiry status color code
     * Returns: 'success', 'warning', 'danger', 'expired'
     */
    public function getExpiryStatusColor(): string
    {
        $days = $this->getDaysUntilExpiry();

        if ($days === null) {
            return 'default';
        }

        if ($days < 0) {
            return 'expired';  // Black/gray - expired
        } elseif ($days <= 15) {
            return 'danger';   // Red - critical (less than amendment time)
        } elseif ($days <= 30) {
            return 'warning';  // Orange - warning (time to start amendment)
        } else {
            return 'success';  // Green - healthy
        }
    }

    /**
     * Get expiry status message
     */
    public function getExpiryStatusMessage(): string
    {
        $days = $this->getDaysUntilExpiry();

        if ($days === null) {
            return 'No expiry date set';
        }

        if ($days < 0) {
            return 'EXPIRED ' . abs($days) . ' days ago';
        } elseif ($days == 0) {
            return 'EXPIRES TODAY';
        } elseif ($days <= 15) {
            return 'CRITICAL: ' . $days . ' days remaining (less than amendment time)';
        } elseif ($days <= 30) {
            return 'WARNING: ' . $days . ' days remaining (start amendment process)';
        } else {
            return $days . ' days remaining';
        }
    }

    /**
     * Check if license budget is being exhausted
     * Compare license total_amount with PO usage
     */
    public function isBudgetExhausted(): bool
    {
        if (!$this->total_amount || !$this->purchaseOrder) {
            return false;
        }

        $poUsage = $this->purchaseOrder->getTotalPOUsage();

        // If PO usage exceeds 80% of license amount, budget is being exhausted
        return ($poUsage / $this->total_amount) > 0.8;
    }

    /**
     * Get license budget usage percentage
     */
    public function getBudgetUsagePercentage(): float
    {
        if (!$this->total_amount || !$this->purchaseOrder) {
            return 0.0;
        }

        $poUsage = $this->purchaseOrder->getTotalPOUsage();

        return ($poUsage / $this->total_amount) * 100;
    }
}
