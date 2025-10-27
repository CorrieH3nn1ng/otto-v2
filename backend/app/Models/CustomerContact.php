<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CustomerContact extends Model
{
    protected $fillable = [
        'customer_id',
        'contact_name',
        'contact_type',
        'phone',
        'email',
        'is_default',
        'notes',
    ];

    protected $casts = [
        'is_default' => 'boolean',
    ];

    /**
     * Get the customer that owns the contact
     */
    public function customer(): BelongsTo
    {
        return $this->belongsTo(Customer::class);
    }

    /**
     * Find a contact by customer and type
     *
     * @param int $customerId
     * @param string $type
     * @return CustomerContact|null
     */
    public static function findByCustomerAndType(int $customerId, string $type)
    {
        return static::where('customer_id', $customerId)
            ->where('contact_type', $type)
            ->where('is_default', true)
            ->first();
    }
}
