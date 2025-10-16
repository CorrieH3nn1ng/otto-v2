<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

class Invoice extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'invoice_number',
        'invoice_date',
        'supplier_id',
        'customer_id',
        'total_amount',
        'currency',
        'purchase_order',
        'incoterms',
        'payment_terms',
        'delivery_method',
        'delivery_address',
        'supplier_address',
        'supplier_contact',
        'supplier_email',
        'exporter_code',
        'hs_code',
        'country_of_origin',
        'exit_agent',
        'entry_agent',
        'status',
        'current_owner',
        'current_stage',
        'can_proceed_to_transport',
        'blocked_waiting_for_documents',
        'blocked_waiting_for_transport_planner',
        'qc_status',
        'bv_status',
        'requires_qc',
        'requires_bv',
        'requires_feri',
        'has_qc_certificate',
        'has_bv_certificate',
        'has_feri_certificate',
        'extracted_data',
        'receiving_completed_at',
        'doc_verify_completed_at',
        'qc_inspection_completed_at',
        'bv_inspection_completed_at',
        'ready_dispatch_at',
        'workflow_notes',
    ];

    protected $casts = [
        'invoice_date' => 'date',
        'total_amount' => 'decimal:2',
        'extracted_data' => 'array',
        'can_proceed_to_transport' => 'boolean',
        'blocked_waiting_for_documents' => 'boolean',
        'blocked_waiting_for_transport_planner' => 'boolean',
        'requires_qc' => 'boolean',
        'requires_bv' => 'boolean',
        'requires_feri' => 'boolean',
        'has_qc_certificate' => 'boolean',
        'has_bv_certificate' => 'boolean',
        'has_feri_certificate' => 'boolean',
        'receiving_completed_at' => 'datetime',
        'doc_verify_completed_at' => 'datetime',
        'qc_inspection_completed_at' => 'datetime',
        'bv_inspection_completed_at' => 'datetime',
        'ready_dispatch_at' => 'datetime',
    ];

    // Relationships
    public function customer(): BelongsTo
    {
        return $this->belongsTo(Customer::class);
    }

    public function supplier(): BelongsTo
    {
        return $this->belongsTo(Supplier::class);
    }

    public function documents(): HasMany
    {
        return $this->hasMany(Document::class);
    }

    public function loadConfirmations(): BelongsToMany
    {
        return $this->belongsToMany(LoadConfirmation::class, 'invoice_load_confirmation');
    }

    public function manifests(): BelongsToMany
    {
        return $this->belongsToMany(Manifest::class, 'invoice_manifest');
    }

    public function lineItems(): HasMany
    {
        return $this->hasMany(InvoiceLineItem::class);
    }

    public function packingDetails(): HasMany
    {
        return $this->hasMany(PackingDetail::class);
    }

    public function deliveryNoteItems(): HasMany
    {
        return $this->hasMany(DeliveryNoteItem::class);
    }

    // Workflow helper methods (like old Otto)
    public function checkDocumentCompleteness(): bool
    {
        $hasInvoice = $this->documents()->where('document_type', 'invoice')->exists();

        $qcOk = !$this->requires_qc || $this->has_qc_certificate;
        $bvOk = !$this->requires_bv || $this->has_bv_certificate;

        return $hasInvoice && $qcOk && $bvOk;
    }

    public function updateWorkflowStatus(): void
    {
        $isComplete = $this->checkDocumentCompleteness();

        $this->update([
            'can_proceed_to_transport' => $isComplete,
            'blocked_waiting_for_documents' => !$isComplete,
        ]);
    }

    /**
     * Get workflow stage configuration (from old Otto system)
     */
    public function getWorkflowStages(): array
    {
        return [
            [
                'code' => 'receiving',
                'name' => 'Receiving and Acknowledgement',
                'description' => 'Acknowledge receipt of shipment notification within 2 hours',
                'order' => 1,
                'sla_hours' => 2,
                'requires_qc' => false,
                'requires_bv' => false,
                'icon' => 'inbox',
                'color' => '#3B82F6'
            ],
            [
                'code' => 'doc_verify',
                'name' => 'Document Integrity',
                'description' => 'Verify completeness and accuracy of all documents',
                'order' => 2,
                'sla_hours' => 48,
                'requires_qc' => false,
                'requires_bv' => false,
                'icon' => 'file-check',
                'color' => '#10B981'
            ],
            [
                'code' => 'qc_inspection',
                'name' => 'QC Inspection',
                'description' => 'Quality control inspection of goods',
                'order' => 3,
                'sla_hours' => 72,
                'requires_qc' => true,
                'requires_bv' => false,
                'icon' => 'clipboard-check',
                'color' => '#F59E0B'
            ],
            [
                'code' => 'bv_inspection',
                'name' => 'BV Inspection',
                'description' => 'Bureau Veritas third-party inspection',
                'order' => 4,
                'sla_hours' => 120,
                'requires_qc' => false,
                'requires_bv' => true,
                'icon' => 'shield-check',
                'color' => '#8B5CF6'
            ],
            [
                'code' => 'ready_dispatch',
                'name' => 'Ready for Dispatch',
                'description' => 'All documentation complete, ready for final dispatch',
                'order' => 5,
                'sla_hours' => 12,
                'requires_qc' => false,
                'requires_bv' => false,
                'icon' => 'truck',
                'color' => '#14B8A6'
            ],
        ];
    }

    /**
     * Check if invoice can progress to next stage
     * Simplified: Allow progression as long as invoice exists
     * Document verification happens at Ready for Dispatch stage
     */
    public function canProgressToNextStage(): bool
    {
        $currentStage = $this->current_stage;

        switch ($currentStage) {
            case 'receiving':
            case 'doc_verify':
                // Can always progress - documents come later
                return true;

            case 'qc_inspection':
                // Only applicable if QC is required
                if (!$this->requires_qc) {
                    return true; // Skip if not required
                }
                // Can progress without certificate for now
                return true;

            case 'bv_inspection':
                // Only applicable if BV is required
                if (!$this->requires_bv) {
                    return true; // Skip if not required
                }
                // Can progress without certificate for now
                return true;

            case 'ready_dispatch':
                // Final stage - can proceed to transport/manifest level
                return true;

            default:
                return false;
        }
    }

    /**
     * Progress to next workflow stage
     */
    public function progressToNextStage(?string $notes = null): bool
    {
        if (!$this->canProgressToNextStage()) {
            return false;
        }

        $stages = ['receiving', 'doc_verify', 'qc_inspection', 'bv_inspection', 'ready_dispatch'];
        $currentIndex = array_search($this->current_stage, $stages);

        if ($currentIndex === false) {
            return false;
        }

        // Mark current stage as complete
        $completionField = $this->current_stage . '_completed_at';
        if (in_array($completionField, $this->fillable)) {
            $this->$completionField = now();
        }

        // Move to next stage (skip QC/BV if not required)
        $nextIndex = $currentIndex + 1;
        while ($nextIndex < count($stages)) {
            $nextStage = $stages[$nextIndex];

            // Skip QC if not required
            if ($nextStage === 'qc_inspection' && !$this->requires_qc) {
                $this->qc_inspection_completed_at = now();
                $nextIndex++;
                continue;
            }

            // Skip BV if not required
            if ($nextStage === 'bv_inspection' && !$this->requires_bv) {
                $this->bv_inspection_completed_at = now();
                $nextIndex++;
                continue;
            }

            // Found the next applicable stage
            $this->current_stage = $nextStage;
            break;
        }

        // Add notes if provided
        if ($notes) {
            $this->workflow_notes = ($this->workflow_notes ?? '') . "\n[" . now()->toDateTimeString() . "] " . $notes;
        }

        return $this->save();
    }

    /**
     * Get current workflow progress percentage
     */
    public function getWorkflowProgress(): int
    {
        $stages = ['receiving', 'doc_verify', 'qc_inspection', 'bv_inspection', 'ready_dispatch'];
        $completedCount = 0;
        $totalApplicableStages = 0;

        foreach ($stages as $stage) {
            // Count applicable stages
            if ($stage === 'qc_inspection' && !$this->requires_qc) {
                continue;
            }
            if ($stage === 'bv_inspection' && !$this->requires_bv) {
                continue;
            }
            $totalApplicableStages++;

            // Count completed stages
            $completionField = $stage . '_completed_at';
            if ($this->$completionField !== null) {
                $completedCount++;
            }
        }

        return $totalApplicableStages > 0
            ? round(($completedCount / $totalApplicableStages) * 100)
            : 0;
    }
}
