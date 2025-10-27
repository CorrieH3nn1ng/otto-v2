<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Transporter extends Model
{
    protected $fillable = [
        'company_name',
        'contact_person',
        'phone',
        'email',
        'vehicle_types',
    ];

    public function loadConfirmations(): HasMany
    {
        return $this->hasMany(LoadConfirmation::class);
    }

    /**
     * Find transporter by name with fuzzy matching
     * Handles spacing and case differences (e.g., "AMOZA LOGIX" matches "AMOZALOGIX")
     *
     * @param string $name
     * @return Transporter|null
     */
    public static function findByName(string $name)
    {
        if (empty($name)) {
            return null;
        }

        // Clean up name (remove spaces, convert to uppercase)
        $cleanName = strtoupper(str_replace(' ', '', trim($name)));

        // Try exact match first
        $transporter = static::whereRaw('UPPER(REPLACE(company_name, " ", "")) = ?', [$cleanName])->first();

        return $transporter;
    }
}
