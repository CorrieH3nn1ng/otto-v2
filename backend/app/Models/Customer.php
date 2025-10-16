<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Customer extends Model
{
    protected $fillable = [
        'name',
        'code',
        'delivery_address',
        'billing_address',
        'country',
        'contact_person',
        'email',
        'phone',
        'requires_qc',
        'qc_notes',
    ];

    protected $casts = [
        'requires_qc' => 'boolean',
    ];

    public function invoices(): HasMany
    {
        return $this->hasMany(Invoice::class);
    }
}
