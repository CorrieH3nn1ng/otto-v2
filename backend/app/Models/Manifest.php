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
        'border_post',
        'customs_office',
        'customs_status',
        'feri_application_date',
        'certificate_of_destination_date',
        'status',
        'contract_number',
        'area_and_phase',
        'project_code',
        'cod_number',
        'driver_instruction_1',
        'driver_instruction_2',
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
