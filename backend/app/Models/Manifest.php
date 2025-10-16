<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

class Manifest extends Model
{
    protected $fillable = [
        'manifest_number',
        'load_confirmation_id',
        'export_date',
        'customs_status',
        'feri_application_date',
        'certificate_of_destination_date',
        'status',
    ];

    protected $casts = [
        'export_date' => 'date',
        'feri_application_date' => 'date',
        'certificate_of_destination_date' => 'date',
    ];

    public function loadConfirmation(): BelongsTo
    {
        return $this->belongsTo(LoadConfirmation::class);
    }

    public function invoices(): BelongsToMany
    {
        return $this->belongsToMany(Invoice::class, 'invoice_manifest')
            ->withTimestamps();
    }
}
