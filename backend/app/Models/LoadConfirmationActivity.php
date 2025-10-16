<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class LoadConfirmationActivity extends Model
{
    protected $fillable = [
        'load_confirmation_id',
        'activity_type',
        'user_name',
        'description',
        'metadata',
    ];

    protected $casts = [
        'metadata' => 'array',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    /**
     * Get the load confirmation that owns this activity
     */
    public function loadConfirmation(): BelongsTo
    {
        return $this->belongsTo(LoadConfirmation::class);
    }
}
