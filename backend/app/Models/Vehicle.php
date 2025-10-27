<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Vehicle extends Model
{
    protected $fillable = [
        'horse_reg',
        'trailer_reg',
        'trailer_reg_1',
        'transporter',
        'truck_type',
    ];

    /**
     * Find vehicle by any registration number (horse, trailer1, or trailer2)
     *
     * @param string $registration
     * @return Vehicle|null
     */
    public static function findByRegistration(string $registration)
    {
        if (empty($registration)) {
            return null;
        }

        // Clean up registration (remove spaces, convert to uppercase)
        $cleanReg = strtoupper(trim($registration));

        return static::where('horse_reg', $cleanReg)
            ->orWhere('trailer_reg', $cleanReg)
            ->orWhere('trailer_reg_1', $cleanReg)
            ->first();
    }

    /**
     * Get full vehicle description
     *
     * @return string
     */
    public function getFullDescription()
    {
        $parts = [$this->horse_reg];

        if ($this->trailer_reg && $this->trailer_reg !== 'N/A') {
            $parts[] = $this->trailer_reg;
        }

        if ($this->trailer_reg_1 && $this->trailer_reg_1 !== 'N/A') {
            $parts[] = $this->trailer_reg_1;
        }

        return implode(' + ', $parts) . ' (' . $this->truck_type . ')';
    }
}
