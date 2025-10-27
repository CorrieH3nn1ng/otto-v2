<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Department extends Model
{
    protected $fillable = [
        'name',
        'code',
        'loadconfirmation_contacts',
        'default_contact_name',
        'default_contact_phone',
        'default_contact_email',
        'notes',
    ];

    public function users(): HasMany
    {
        return $this->hasMany(User::class);
    }

    public function invoices(): HasMany
    {
        return $this->hasMany(Invoice::class);
    }

    /**
     * Get formatted default contact for load confirmations
     *
     * @return string|null
     */
    public function getDefaultContactFormatted(): ?string
    {
        if (!$this->default_contact_name) {
            return null;
        }

        $parts = [$this->default_contact_name];

        if ($this->default_contact_phone) {
            $parts[] = $this->default_contact_phone;
        }

        if ($this->default_contact_email) {
            $parts[] = $this->default_contact_email;
        }

        return implode("\n", $parts);
    }
}
