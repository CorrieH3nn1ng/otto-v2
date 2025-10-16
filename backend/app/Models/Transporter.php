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
}
