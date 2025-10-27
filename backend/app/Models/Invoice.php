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
        'invoice_type',
        'parent_invoice_id',
        'supplier_id',
        'customer_id',
        'total_amount',
        'currency',
        'purchase_order',
        'customer_reference',
        'rfq_number',
        'internal_reference',
        'end_user',
        'customer_account_code',
        'tax_reference_number',
        'import_export_number',
        'customs_declaration_number',
        'po_budget_amount',
        'budget_variance',
        'budget_variance_percentage',
        'ordered_quantity_tons',
        'track_consumption',
        'tracked_item_code',
        'tracked_supplier_code',
        'expected_weight_kg',
        'actual_weight_kg',
        'weight_variance_kg',
        'exchange_rate',
        'exchange_rate_date',
        'exchange_rate_source',
        'rate_variance_from_parent',
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
        'vehicle_registration',
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
        // Invoice versioning fields
        'is_superseded',
        'superseded_by_invoice_id',
        'superseded_at',
    ];

    protected $casts = [
        'invoice_date' => 'date',
        'exchange_rate_date' => 'date',
        'total_amount' => 'decimal:2',
        'po_budget_amount' => 'decimal:2',
        'budget_variance' => 'decimal:2',
        'budget_variance_percentage' => 'decimal:4',
        'ordered_quantity_tons' => 'decimal:3',
        'track_consumption' => 'boolean',
        'expected_weight_kg' => 'decimal:2',
        'actual_weight_kg' => 'decimal:2',
        'weight_variance_kg' => 'decimal:2',
        'exchange_rate' => 'decimal:6',
        'rate_variance_from_parent' => 'decimal:4',
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
        'is_superseded' => 'boolean',
        'superseded_at' => 'datetime',
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

    // KAMOA PO/Invoice Linking - Parent/Children relationships
    public function parent(): BelongsTo
    {
        return $this->belongsTo(Invoice::class, 'parent_invoice_id');
    }

    public function children(): HasMany
    {
        return $this->hasMany(Invoice::class, 'parent_invoice_id');
    }

    // Import Licenses - linked at PO level
    public function licenses(): HasMany
    {
        return $this->hasMany(License::class, 'purchase_order_id');
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

    /**
     * KAMOA - Calculate budget variance from parent PO
     * Automatically called when creating commercial invoice linked to PO
     */
    public function calculateBudgetVariance(): void
    {
        if (!$this->parent_invoice_id || !$this->parent) {
            return;
        }

        $parentBudget = $this->parent->po_budget_amount ?? $this->parent->total_amount;

        if ($parentBudget > 0) {
            $variance = $this->total_amount - $parentBudget;
            $variancePercentage = ($variance / $parentBudget) * 100;

            $this->budget_variance = $variance;
            $this->budget_variance_percentage = round($variancePercentage, 2);
        }
    }

    /**
     * KAMOA - Get budget variance color code
     * 50% usage = yellow, 80% usage = orange
     * Returns: 'success', 'warning', 'danger'
     */
    public function getBudgetVarianceColor(): string
    {
        if (!$this->parent || !$this->parent->po_budget_amount) {
            return 'default';
        }

        $usagePercentage = ($this->total_amount / $this->parent->po_budget_amount) * 100;

        if ($usagePercentage <= 50) {
            return 'success';  // Green - good
        } elseif ($usagePercentage <= 80) {
            return 'warning';  // Yellow - attention needed
        } else {
            return 'danger';   // Orange/Red - critical
        }
    }

    /**
     * KAMOA - Get budget variance severity level
     * Returns: 'low', 'medium', 'high', 'critical'
     */
    public function getBudgetVarianceSeverity(): string
    {
        if (!$this->parent || !$this->parent->po_budget_amount) {
            return 'none';
        }

        $usagePercentage = ($this->total_amount / $this->parent->po_budget_amount) * 100;

        if ($usagePercentage <= 50) {
            return 'low';
        } elseif ($usagePercentage <= 80) {
            return 'medium';
        } elseif ($usagePercentage <= 100) {
            return 'high';
        } else {
            return 'critical';  // Over budget!
        }
    }

    /**
     * KAMOA - Check if management intervention required
     * Based on budget usage: >80% = alert, >100% = intervention
     */
    public function requiresManagementIntervention(): bool
    {
        if (!$this->parent || !$this->parent->po_budget_amount) {
            return false;
        }

        $usagePercentage = ($this->total_amount / $this->parent->po_budget_amount) * 100;

        return $usagePercentage > 80;  // Alert at 80%+
    }

    /**
     * KAMOA - Get remaining budget
     */
    public function getRemainingBudget(): float
    {
        if (!$this->parent || !$this->parent->po_budget_amount) {
            return 0.0;
        }

        return max(0, $this->parent->po_budget_amount - $this->total_amount);
    }

    /**
     * KAMOA - Calculate weight variance
     */
    public function calculateWeightVariance(): void
    {
        if ($this->expected_weight_kg && $this->actual_weight_kg) {
            $this->weight_variance_kg = $this->actual_weight_kg - $this->expected_weight_kg;
        }
    }

    /**
     * KAMOA - Get total amount used from PO (sum of all child invoices)
     * For Purchase Orders only
     */
    public function getTotalPOUsage(): float
    {
        if ($this->invoice_type !== 'purchase_order') {
            return 0.0;
        }

        return $this->children()
            ->where('invoice_type', 'commercial_invoice')
            ->sum('total_amount');
    }

    /**
     * KAMOA - Get PO budget usage percentage
     * For Purchase Orders only
     */
    public function getPOUsagePercentage(): float
    {
        if ($this->invoice_type !== 'purchase_order' || !$this->po_budget_amount) {
            return 0.0;
        }

        $totalUsed = $this->getTotalPOUsage();

        return ($totalUsed / $this->po_budget_amount) * 100;
    }

    /**
     * KAMOA - Get PO usage color code
     * 50% usage = yellow, 80% usage = orange
     * For Purchase Orders only - linked to license tracking
     */
    public function getPOUsageColor(): string
    {
        if ($this->invoice_type !== 'purchase_order') {
            return 'default';
        }

        $usagePercentage = $this->getPOUsagePercentage();

        if ($usagePercentage <= 50) {
            return 'success';  // Green - plenty of budget remaining
        } elseif ($usagePercentage <= 80) {
            return 'warning';  // Yellow - monitor closely
        } else {
            return 'danger';   // Orange/Red - critical, license may need attention
        }
    }

    /**
     * KAMOA - Get remaining PO budget
     * For Purchase Orders only
     */
    public function getRemainingPOBudget(): float
    {
        if ($this->invoice_type !== 'purchase_order' || !$this->po_budget_amount) {
            return 0.0;
        }

        $totalUsed = $this->getTotalPOUsage();

        return max(0, $this->po_budget_amount - $totalUsed);
    }

    /**
     * KAMOA - Check if PO requires management intervention
     * >80% usage triggers alert due to license implications
     */
    public function pORequiresIntervention(): bool
    {
        if ($this->invoice_type !== 'purchase_order') {
            return false;
        }

        return $this->getPOUsagePercentage() > 80;
    }

    /**
     * KAMOA - Get all commercial invoices linked to this PO
     * For Purchase Orders only
     */
    public function getLinkedInvoices()
    {
        if ($this->invoice_type !== 'purchase_order') {
            return collect();
        }

        return $this->children()
            ->where('invoice_type', 'commercial_invoice')
            ->with(['supplier', 'customer', 'documents'])
            ->get();
    }

    /**
     * KAMOA - Get all import declarations (licenses) linked to this PO
     * Via child commercial invoices
     */
    public function getLinkedLicenses()
    {
        if ($this->invoice_type !== 'purchase_order') {
            return collect();
        }

        return $this->children()
            ->where('invoice_type', 'commercial_invoice')
            ->whereNotNull('customs_declaration_number')
            ->with(['documents' => function ($query) {
                $query->where('document_type', 'customs_declaration');
            }])
            ->get();
    }

    /**
     * SPECIAL PROJECT - Get total calculated/expected weight in tons from child invoices
     * For Purchase Orders with consumption tracking enabled
     */
    public function getCalculatedTons(): float
    {
        if ($this->invoice_type !== 'purchase_order' || !$this->track_consumption) {
            return 0.0;
        }

        // Sum expected weight from all child commercial invoices
        $totalKg = $this->children()
            ->where('invoice_type', 'commercial_invoice')
            ->sum('expected_weight_kg');

        // Convert kg to tons
        return round($totalKg / 1000, 3);
    }

    /**
     * SPECIAL PROJECT - Get total actual weight in tons from child invoices
     * For Purchase Orders with consumption tracking enabled
     */
    public function getActualTons(): float
    {
        if ($this->invoice_type !== 'purchase_order' || !$this->track_consumption) {
            return 0.0;
        }

        // Sum actual weight from all child commercial invoices (confirmed weights)
        $totalKg = $this->children()
            ->where('invoice_type', 'commercial_invoice')
            ->whereNotNull('actual_weight_kg')
            ->sum('actual_weight_kg');

        // Convert kg to tons
        return round($totalKg / 1000, 3);
    }

    /**
     * SPECIAL PROJECT - Get total consumed weight in tons from child invoices
     * For Purchase Orders with consumption tracking enabled
     * Uses actual weight if available, otherwise uses expected weight
     */
    public function getConsumedTons(): float
    {
        if ($this->invoice_type !== 'purchase_order' || !$this->track_consumption) {
            return 0.0;
        }

        // Sum weight from all child commercial invoices
        // Use actual weight if available, otherwise use expected weight
        $totalKg = $this->children()
            ->where('invoice_type', 'commercial_invoice')
            ->get()
            ->sum(function ($invoice) {
                return $invoice->actual_weight_kg ?? $invoice->expected_weight_kg ?? 0;
            });

        // Convert kg to tons
        return round($totalKg / 1000, 3);
    }

    /**
     * SPECIAL PROJECT - Get consumption percentage
     * For Purchase Orders with consumption tracking enabled
     */
    public function getConsumptionPercentage(): float
    {
        if ($this->invoice_type !== 'purchase_order' || !$this->track_consumption || !$this->ordered_quantity_tons) {
            return 0.0;
        }

        $consumed = $this->getConsumedTons();

        return round(($consumed / $this->ordered_quantity_tons) * 100, 2);
    }

    /**
     * SPECIAL PROJECT - Get remaining quantity in tons
     * For Purchase Orders with consumption tracking enabled
     */
    public function getRemainingQuantityTons(): float
    {
        if ($this->invoice_type !== 'purchase_order' || !$this->track_consumption || !$this->ordered_quantity_tons) {
            return 0.0;
        }

        $consumed = $this->getConsumedTons();

        return max(0, $this->ordered_quantity_tons - $consumed);
    }

    /**
     * SPECIAL PROJECT - Get consumption rate (tons per day)
     * Based on deliveries from child invoices
     * Uses actual weight if available, otherwise uses expected weight
     * For Purchase Orders with consumption tracking enabled
     */
    public function getConsumptionRate(): float
    {
        if ($this->invoice_type !== 'purchase_order' || !$this->track_consumption) {
            return 0.0;
        }

        // Get all child invoices with dates and weights (actual or expected)
        $childInvoices = $this->children()
            ->where('invoice_type', 'commercial_invoice')
            ->whereNotNull('invoice_date')
            ->where(function($query) {
                $query->whereNotNull('actual_weight_kg')
                      ->orWhereNotNull('expected_weight_kg');
            })
            ->orderBy('invoice_date', 'asc')
            ->get(['invoice_date', 'actual_weight_kg', 'expected_weight_kg']);

        if ($childInvoices->count() < 2) {
            // Need at least 2 deliveries to calculate rate
            return 0.0;
        }

        // Calculate date range
        $firstDate = $childInvoices->first()->invoice_date;
        $lastDate = $childInvoices->last()->invoice_date;
        $daysDiff = $firstDate->diffInDays($lastDate);

        if ($daysDiff == 0 || $daysDiff === null) {
            return 0.0;
        }

        // Calculate total weight delivered (use actual if available, otherwise expected)
        $totalKg = $childInvoices->sum(function ($invoice) {
            return $invoice->actual_weight_kg ?? $invoice->expected_weight_kg ?? 0;
        });
        $totalTons = $totalKg / 1000;

        // Prevent division by zero
        if ($daysDiff <= 0) {
            return 0.0;
        }

        // Calculate tons per day
        return round($totalTons / $daysDiff, 3);
    }

    /**
     * SPECIAL PROJECT - Get estimated days to completion
     * Based on current consumption rate
     * For Purchase Orders with consumption tracking enabled
     */
    public function getEstimatedDaysToCompletion(): ?int
    {
        if ($this->invoice_type !== 'purchase_order' || !$this->track_consumption) {
            return null;
        }

        $consumptionRate = $this->getConsumptionRate();

        if ($consumptionRate <= 0) {
            // Cannot estimate without valid consumption rate
            return null;
        }

        $remainingTons = $this->getRemainingQuantityTons();

        if ($remainingTons <= 0) {
            // Order complete or over-consumed
            return 0;
        }

        // Calculate estimated days
        $estimatedDays = ceil($remainingTons / $consumptionRate);

        return (int) $estimatedDays;
    }

    /**
     * SPECIAL PROJECT - Get consumption color code
     * Similar to PO usage color coding
     * For Purchase Orders with consumption tracking enabled
     */
    public function getConsumptionColor(): string
    {
        if ($this->invoice_type !== 'purchase_order' || !$this->track_consumption) {
            return 'default';
        }

        $consumptionPercentage = $this->getConsumptionPercentage();

        if ($consumptionPercentage <= 70) {
            return 'success';  // Green - healthy progress
        } elseif ($consumptionPercentage <= 90) {
            return 'warning';  // Yellow - monitor closely
        } else {
            return 'danger';   // Red - critical, nearing completion
        }
    }

    /**
     * Calculate expected weight from line items
     * Parses description to extract unit weight (e.g., "1000kg Alte Spray")
     * Returns total weight in kg
     */
    public function calculateExpectedWeightFromLineItems(): float
    {
        $totalWeight = 0.0;

        foreach ($this->lineItems as $lineItem) {
            // Parse description to extract weight per unit
            // Patterns: "1000kg", "1000 kg", "1000KG", etc.
            $description = $lineItem->description ?? '';
            $quantity = $lineItem->quantity ?? 0;

            // Match weight patterns in description (e.g., "1000kg", "500 kg")
            if (preg_match('/(\d+(?:\.\d+)?)\s*kg/i', $description, $matches)) {
                $weightPerUnit = (float) $matches[1];
                $totalWeight += $quantity * $weightPerUnit;
            }
        }

        return round($totalWeight, 2);
    }

    /**
     * Calculate expected weight from packing details
     * Returns total weight in kg from packing list
     */
    public function calculateExpectedWeightFromPackingDetails(): float
    {
        $totalWeight = $this->packingDetails()
            ->selectRaw('SUM(quantity * gross_weight_kg) as total_weight')
            ->value('total_weight');

        return round((float) $totalWeight, 2);
    }

    /**
     * Auto-populate expected_weight_kg from line items or packing details if not set
     * Should be called when invoice is created or line items are updated
     * Priority: 1) Packing details (most accurate), 2) Line items calculation
     */
    public function updateExpectedWeightFromLineItems(): void
    {
        $weightFromLineItems = 0.0;
        $weightFromPackingDetails = 0.0;

        // Try to get weight from line items
        if ($this->lineItems()->count() > 0) {
            $weightFromLineItems = $this->calculateExpectedWeightFromLineItems();
        }

        // Try to get weight from packing details (more accurate if available)
        if ($this->packingDetails()->count() > 0) {
            $weightFromPackingDetails = $this->calculateExpectedWeightFromPackingDetails();
        }

        // Use packing details weight if available, otherwise use line items weight
        $calculatedWeight = $weightFromPackingDetails > 0 ? $weightFromPackingDetails : $weightFromLineItems;

        if ($calculatedWeight > 0) {
            $this->expected_weight_kg = $calculatedWeight;
            $this->save();
        }
    }
}
