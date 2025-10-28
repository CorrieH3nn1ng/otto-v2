<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Invoice;
use App\Models\InvoiceActivity;
use App\Models\Document;
use App\Models\Customer;
use App\Models\Supplier;
use App\Models\InvoiceLineItem;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Storage;

class InvoiceController extends Controller
{
    /**
     * Get all invoices with optional filtering by owner/stage
     */
    public function index(Request $request): JsonResponse
    {
        $query = Invoice::with(['customer', 'supplier', 'documents', 'packingDetails', 'loadConfirmations', 'manifests']);

        // Filter by current owner
        if ($request->has('owner')) {
            $query->where('current_owner', $request->owner);
        }

        // Filter by current stage
        if ($request->has('stage')) {
            $query->where('current_stage', $request->stage);
        }

        // Filter by status
        if ($request->has('status')) {
            $query->where('status', $request->status);
        }

        // Filter blocked invoices
        if ($request->has('blocked')) {
            if ($request->blocked === 'true') {
                $query->where(function($q) {
                    $q->where('blocked_waiting_for_documents', true)
                      ->orWhere('blocked_waiting_for_transport_planner', true);
                });
            }
        }

        $invoices = $query->orderBy('invoice_date', 'desc')->get();

        return response()->json([
            'success' => true,
            'data' => $invoices
        ]);
    }

    /**
     * Get a single invoice with all relationships
     */
    public function show(int $id): JsonResponse
    {
        $invoice = Invoice::with([
            'customer',
            'supplier',
            'documents',
            'loadConfirmations.transporter',
            'manifests',
            'lineItems',
            'packingDetails',
            'deliveryNoteItems'
        ])->findOrFail($id);

        // Convert to array and use database columns directly (they're already populated from acknowledge)
        $invoiceArray = $invoice->toArray();

        // Map purchase_order to po_number for frontend compatibility
        $invoiceArray['po_number'] = $invoice->purchase_order;

        // Add consumption tracking metrics if enabled
        try {
            if ($invoice->invoice_type === 'purchase_order' && $invoice->track_consumption) {
                $invoiceArray['consumed_tons'] = $invoice->getConsumedTons();
                $invoiceArray['consumption_percentage'] = $invoice->getConsumptionPercentage();
                $invoiceArray['remaining_quantity_tons'] = $invoice->getRemainingQuantityTons();
                $invoiceArray['consumption_rate'] = $invoice->getConsumptionRate();
                $invoiceArray['estimated_days_to_completion'] = $invoice->getEstimatedDaysToCompletion();
                $invoiceArray['consumption_color'] = $invoice->getConsumptionColor();
            }
        } catch (\Exception $e) {
            \Log::error('Consumption tracking error: ' . $e->getMessage());
            // Continue without consumption metrics
        }

        return response()->json($invoiceArray);
    }

    /**
     * Create a new invoice
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'invoice_number' => 'required|string', // Removed unique - handling manually
            'invoice_date' => 'required|date',
            'supplier_id' => 'required|exists:suppliers,id',
            'customer_id' => 'required|exists:customers,id',
            'total_amount' => 'required|numeric',
            'currency' => 'required|string|max:3',
            'purchase_order' => 'nullable|string',
            'incoterms' => 'nullable|string',
            'extracted_data' => 'nullable|array',
            'requires_qc' => 'boolean',
            'requires_bv' => 'boolean',
            'requires_feri' => 'boolean',
            // KAMOA PO tracking fields
            'invoice_type' => 'nullable|in:purchase_order,proforma_invoice,commercial_invoice',
            'parent_invoice_id' => 'nullable|exists:invoices,id',
            'customer_reference' => 'nullable|string',
            'rfq_number' => 'nullable|string',
            'internal_reference' => 'nullable|string',
            'end_user' => 'nullable|string',
            'customer_account_code' => 'nullable|string|max:50',
            'tax_reference_number' => 'nullable|string|max:100',
            'import_export_number' => 'nullable|string|max:100',
            'customs_declaration_number' => 'nullable|string|max:100',
            'po_budget_amount' => 'nullable|numeric',
            'expected_weight_kg' => 'nullable|numeric',
            'actual_weight_kg' => 'nullable|numeric',
            'exchange_rate' => 'nullable|numeric',
            'exchange_rate_date' => 'nullable|date',
            'exchange_rate_source' => 'nullable|string|max:50',
            'vehicle_registration' => 'nullable|string|max:50',
            'delivery_address' => 'nullable|string',
            'supplier_address' => 'nullable|string',
            'supplier_contact' => 'nullable|string',
        ]);

        // Check for existing invoice with same supplier + invoice number
        $existingInvoice = Invoice::where('supplier_id', $validated['supplier_id'])
            ->where('invoice_number', $validated['invoice_number'])
            ->where('is_superseded', false) // Only check active invoices
            ->first();

        if ($existingInvoice) {
            // Duplicate detected - handle based on status
            if (in_array($existingInvoice->status, ['draft', 'pending_approval'])) {
                // STATUS: Draft or Pending → REPLACE (update existing)

                // Inherit entry_agent from parent PO if not explicitly provided
                if (isset($validated['parent_invoice_id']) && $existingInvoice->invoice_type === 'commercial_invoice') {
                    // Check if entry_agent is not set OR is empty (null, empty string, etc.)
                    if (!isset($validated['entry_agent']) || empty($validated['entry_agent']) || $validated['entry_agent'] === '') {
                        $parentPO = Invoice::find($validated['parent_invoice_id']);
                        if ($parentPO && !empty($parentPO->entry_agent)) {
                            $validated['entry_agent'] = $parentPO->entry_agent;
                            \Log::info("Inherited entry_agent from PO {$parentPO->id} to existing invoice: {$parentPO->entry_agent}");
                        }
                    }
                }

                $existingInvoice->update($validated);

                // Recalculate variances
                if ($existingInvoice->parent_invoice_id && $existingInvoice->invoice_type === 'commercial_invoice') {
                    $existingInvoice->calculateBudgetVariance();
                }
                if ($existingInvoice->expected_weight_kg && $existingInvoice->actual_weight_kg) {
                    $existingInvoice->calculateWeightVariance();
                }
                $existingInvoice->save();

                return response()->json([
                    'invoice' => $existingInvoice->fresh(['customer', 'supplier', 'parent']),
                    'action' => 'updated',
                    'message' => "Invoice {$validated['invoice_number']} was in draft status and has been updated with new data."
                ], 200);
            } else {
                // STATUS: Approved or beyond → CREATE NEW VERSION (versioning)
                // Mark old invoice as superseded
                $existingInvoice->is_superseded = true;
                $existingInvoice->superseded_at = now();
                $existingInvoice->save();

                // Create new version linked to old one
                $validated['parent_invoice_id'] = $existingInvoice->id;
            }
        }

        // Set invoice type default if not provided
        if (!isset($validated['invoice_type'])) {
            $validated['invoice_type'] = 'commercial_invoice';
        }

        // Inherit entry_agent from parent PO if not explicitly provided
        if (isset($validated['parent_invoice_id']) && $validated['invoice_type'] === 'commercial_invoice') {
            // Check if entry_agent is not set OR is empty (null, empty string, etc.)
            if (!isset($validated['entry_agent']) || empty($validated['entry_agent']) || $validated['entry_agent'] === '') {
                $parentPO = Invoice::find($validated['parent_invoice_id']);
                if ($parentPO && !empty($parentPO->entry_agent)) {
                    $validated['entry_agent'] = $parentPO->entry_agent;
                    \Log::info("Inherited entry_agent from PO {$parentPO->id}: {$parentPO->entry_agent}");
                }
            }
        }

        // Set initial workflow state
        $validated['current_owner'] = 'key_accounts_manager';
        $validated['current_stage'] = 'invoice_received';
        $validated['status'] = 'draft';
        $validated['can_proceed_to_transport'] = false;
        $validated['blocked_waiting_for_documents'] = true;

        $invoice = Invoice::create($validated);

        // If this is a new version, update the superseded_by reference
        if ($existingInvoice && $existingInvoice->is_superseded) {
            $existingInvoice->superseded_by_invoice_id = $invoice->id;
            $existingInvoice->save();
        }

        // Auto-calculate budget variance if linked to parent PO
        if ($invoice->parent_invoice_id && $invoice->invoice_type === 'commercial_invoice') {
            $invoice->calculateBudgetVariance();
            $invoice->save();
        }

        // Auto-calculate weight variance if both weights provided
        if ($invoice->expected_weight_kg && $invoice->actual_weight_kg) {
            $invoice->calculateWeightVariance();
            $invoice->save();
        }

        $action = $existingInvoice && $existingInvoice->is_superseded ? 'versioned' : 'created';
        $message = $existingInvoice && $existingInvoice->is_superseded
            ? "Invoice {$validated['invoice_number']} already existed (approved/in-transit). Created new version (ID: {$invoice->id}), old version (ID: {$existingInvoice->id}) marked as superseded."
            : "Invoice created successfully.";

        return response()->json([
            'invoice' => $invoice->fresh(['customer', 'supplier', 'parent']),
            'action' => $action,
            'message' => $message,
            'old_invoice_id' => $existingInvoice && $existingInvoice->is_superseded ? $existingInvoice->id : null
        ], 201);
    }

    /**
     * Update an invoice
     */
    public function update(Request $request, int $id): JsonResponse
    {
        $invoice = Invoice::findOrFail($id);

        $validated = $request->validate([
            'invoice_number' => 'string|unique:invoices,invoice_number,' . $id,
            'invoice_date' => 'date',
            'supplier_id' => 'exists:suppliers,id',
            'customer_id' => 'exists:customers,id',
            'total_amount' => 'numeric',
            'currency' => 'string|max:3',
            'purchase_order' => 'nullable|string',
            'incoterms' => 'nullable|string',
            'status' => 'string',
            'qc_status' => 'string',
            'bv_status' => 'string',
            'exit_agent' => 'nullable|string',
            'entry_agent' => 'nullable|string',
            'extracted_data' => 'nullable|array',
            'packing_details' => 'nullable|array',
            'packing_details.*.id' => 'nullable|integer',
            'packing_details.*.package_number' => 'nullable|integer',
            'packing_details.*.package_type' => 'nullable|string',
            'packing_details.*.length_cm' => 'nullable|numeric',
            'packing_details.*.width_cm' => 'nullable|numeric',
            'packing_details.*.height_cm' => 'nullable|numeric',
            'packing_details.*.cbm' => 'nullable|numeric',
            'packing_details.*.gross_weight_kg' => 'nullable|numeric',
            'packing_details.*.net_weight_kg' => 'nullable|numeric',
            'packing_details.*.volumetric_weight_kg' => 'nullable|numeric',
            'packing_details.*.contents_description' => 'nullable|string',
            'packing_details.*.file_name' => 'nullable|string',
            'line_items' => 'nullable|array',
            // KAMOA PO tracking fields
            'parent_invoice_id' => 'nullable|exists:invoices,id',
            'customer_reference' => 'nullable|string',
            'rfq_number' => 'nullable|string',
            'internal_reference' => 'nullable|string',
            'end_user' => 'nullable|string',
            'customer_account_code' => 'nullable|string|max:50',
            'tax_reference_number' => 'nullable|string|max:100',
            'import_export_number' => 'nullable|string|max:100',
            'customs_declaration_number' => 'nullable|string|max:100',
            'po_budget_amount' => 'nullable|numeric',
            'expected_weight_kg' => 'nullable|numeric',
            'actual_weight_kg' => 'nullable|numeric',
            'exchange_rate' => 'nullable|numeric',
            'exchange_rate_date' => 'nullable|date',
        ]);

        // Update invoice main fields
        $invoice->update($validated);

        // Handle packing details updates
        if (isset($validated['packing_details'])) {
            foreach ($validated['packing_details'] as $packingDetailData) {
                if (isset($packingDetailData['id'])) {
                    // Update existing packing detail
                    $packingDetail = \App\Models\PackingDetail::find($packingDetailData['id']);
                    if ($packingDetail && $packingDetail->invoice_id === $invoice->id) {
                        $packingDetail->update($packingDetailData);
                    }
                } else {
                    // Create new packing detail
                    $invoice->packingDetails()->create($packingDetailData);
                }
            }

            // Auto-sync invoice_load_confirmation relationships based on file_name assignments
            $this->syncLoadConfirmationRelationships($invoice);
        }

        // Handle line items updates
        if (isset($validated['line_items'])) {
            foreach ($validated['line_items'] as $lineItemData) {
                if (isset($lineItemData['id'])) {
                    // Update existing line item
                    $lineItem = \App\Models\InvoiceLineItem::find($lineItemData['id']);
                    if ($lineItem && $lineItem->invoice_id === $invoice->id) {
                        $lineItem->update($lineItemData);
                    }
                } else {
                    // Create new line item
                    $invoice->lineItems()->create($lineItemData);
                }
            }
        }

        // Auto-calculate budget variance if parent_invoice_id or total_amount changed
        if ($invoice->parent_invoice_id && $invoice->invoice_type === 'commercial_invoice') {
            $invoice->calculateBudgetVariance();
            $invoice->save();
        }

        // Auto-calculate weight variance if weights changed
        if ($invoice->expected_weight_kg && $invoice->actual_weight_kg) {
            $invoice->calculateWeightVariance();
            $invoice->save();
        }

        // Return fresh invoice with relationships
        return response()->json($invoice->fresh([
            'packingDetails',
            'lineItems',
            'customer',
            'supplier',
            'documents',
            'parent'
        ]));
    }

    /**
     * Delete an invoice (soft delete)
     */
    public function destroy(int $id): JsonResponse
    {
        try {
            $invoice = Invoice::findOrFail($id);

            // For Purchase Orders, check if there are linked invoices or activities
            if ($invoice->invoice_type === 'purchase_order') {
                // Check for linked commercial invoices
                $linkedInvoices = Invoice::where('parent_invoice_id', $id)->count();
                if ($linkedInvoices > 0) {
                    return response()->json([
                        'error' => 'Cannot delete PO with linked commercial invoices. Please remove linked invoices first.'
                    ], 422);
                }

                // Check for any activities
                $activities = InvoiceActivity::where('invoice_id', $id)->count();
                if ($activities > 0) {
                    return response()->json([
                        'error' => 'Cannot delete PO with recorded activities.'
                    ], 422);
                }
            }

            // Delete line items first using direct DB query
            \DB::table('invoice_line_items')->where('invoice_id', $id)->delete();

            // Permanently delete the invoice/PO (force delete, not soft delete)
            $invoice->forceDelete();

            return response()->json(['message' => 'Invoice deleted successfully']);
        } catch (\Exception $e) {
            \Log::error('Error deleting invoice: ' . $e->getMessage());
            return response()->json(['error' => 'Failed to delete invoice: ' . $e->getMessage()], 500);
        }
    }

    /**
     * Request transport for an invoice (Key Accounts Manager action)
     */
    public function requestTransport(int $id): JsonResponse
    {
        $invoice = Invoice::findOrFail($id);

        // Check if invoice is ready
        if (!$invoice->can_proceed_to_transport) {
            return response()->json([
                'error' => 'Invoice not ready for transport. Missing required documents.'
            ], 422);
        }

        // Transfer ownership to transport planner
        $invoice->update([
            'current_owner' => 'transport_planner',
            'current_stage' => 'ready_for_transport',
            'blocked_waiting_for_transport_planner' => true,
        ]);

        return response()->json([
            'message' => 'Transport requested successfully',
            'invoice' => $invoice
        ]);
    }

    /**
     * Check document completeness and update workflow status
     */
    public function checkDocuments(int $id): JsonResponse
    {
        $invoice = Invoice::findOrFail($id);
        $invoice->updateWorkflowStatus();

        return response()->json([
            'complete' => $invoice->can_proceed_to_transport,
            'invoice' => $invoice->fresh()
        ]);
    }

    /**
     * Get dashboard statistics
     */
    public function statistics(): JsonResponse
    {
        return response()->json([
            // Invoice counts by status
            'total_invoices' => Invoice::count(),
            'draft' => Invoice::where('status', 'draft')->count(),
            'pending_approval' => Invoice::where('status', 'pending_approval')->count(),
            'approved' => Invoice::where('status', 'approved')->count(),
            'in_transit' => Invoice::where('status', 'in_transit')->count(),
            'delivered' => Invoice::where('status', 'delivered')->count(),

            // Invoice counts by stage
            'stage_receiving' => Invoice::where('current_stage', 'receiving')->count(),
            'stage_ready_dispatch' => Invoice::where('current_stage', 'ready_dispatch')->count(),
            'stage_in_transit' => Invoice::where('current_stage', 'in_transit')->count(),
            'stage_delivered' => Invoice::where('current_stage', 'delivered')->count(),

            // Blocked invoices
            'blocked_documents' => Invoice::where('blocked_waiting_for_documents', true)->count(),
            'blocked_transport' => Invoice::where('blocked_waiting_for_transport_planner', true)->count(),

            // Certificate requirements
            'awaiting_qc' => Invoice::where('requires_qc', true)
                ->where('has_qc_certificate', false)->count(),
            'awaiting_bv' => Invoice::where('requires_bv', true)
                ->where('has_bv_certificate', false)->count(),

            // Transport stats
            'load_confirmations' => \App\Models\LoadConfirmation::whereDoesntHave('manifests')->count(),
            'load_confirmations_pending' => \App\Models\LoadConfirmation::where('status', 'draft')->whereDoesntHave('manifests')->count(),
            'load_confirmations_confirmed' => \App\Models\LoadConfirmation::where('status', 'transport_confirmed')->whereDoesntHave('manifests')->count(),
            'manifests' => \App\Models\Manifest::count(),
            'manifests_in_transit' => \App\Models\Manifest::where('status', 'in_transit')->count(),
        ]);
    }

    /**
     * Get workflow stages for an invoice
     */
    public function getWorkflowStages(int $id): JsonResponse
    {
        $invoice = Invoice::findOrFail($id);

        return response()->json([
            'current_stage' => $invoice->current_stage,
            'workflow_progress' => $invoice->getWorkflowProgress(),
            'can_progress' => $invoice->canProgressToNextStage(),
            'stages' => $invoice->getWorkflowStages(),
            'completion_timestamps' => [
                'receiving' => $invoice->receiving_completed_at,
                'doc_verify' => $invoice->doc_verify_completed_at,
                'qc_inspection' => $invoice->qc_inspection_completed_at,
                'bv_inspection' => $invoice->bv_inspection_completed_at,
                'ready_dispatch' => $invoice->ready_dispatch_at,
            ]
        ]);
    }

    /**
     * Progress invoice to next workflow stage
     */
    public function progressWorkflow(Request $request, int $id): JsonResponse
    {
        $invoice = Invoice::findOrFail($id);

        $validated = $request->validate([
            'notes' => 'nullable|string|max:1000',
        ]);

        if (!$invoice->canProgressToNextStage()) {
            return response()->json([
                'error' => 'Cannot progress to next stage. Requirements not met.',
                'current_stage' => $invoice->current_stage,
                'can_progress' => false,
            ], 422);
        }

        $oldStage = $invoice->current_stage;
        $success = $invoice->progressToNextStage($validated['notes'] ?? null);

        if ($success) {
            return response()->json([
                'message' => 'Workflow progressed successfully',
                'old_stage' => $oldStage,
                'new_stage' => $invoice->current_stage,
                'workflow_progress' => $invoice->getWorkflowProgress(),
                'invoice' => $invoice->fresh(['customer', 'supplier', 'documents'])
            ]);
        } else {
            return response()->json([
                'error' => 'Failed to progress workflow',
            ], 500);
        }
    }

    /**
     * Update QC inspection status
     */
    public function updateQcStatus(Request $request, int $id): JsonResponse
    {
        $invoice = Invoice::findOrFail($id);

        $validated = $request->validate([
            'qc_status' => 'required|string|in:pending,scheduled,in_progress,passed,failed,in_order,blocked',
            'notes' => 'nullable|string|max:1000',
            'scheduled_date' => 'nullable|date',
        ]);

        $oldStatus = $invoice->qc_status;

        // Update QC status
        $invoice->update([
            'qc_status' => $validated['qc_status']
        ]);

        // Add notes to workflow notes if provided
        if (!empty($validated['notes'])) {
            $invoice->workflow_notes = ($invoice->workflow_notes ?? '') . "\n[QC " . now()->toDateTimeString() . "] " . $validated['notes'];
            $invoice->save();
        }

        // If QC passed, mark certificate received and update current stage
        if ($validated['qc_status'] === 'passed') {
            $invoice->update([
                'has_qc_certificate' => true,
                'qc_inspection_completed_at' => now()
            ]);

            // Update current stage to reflect QC completion
            $invoice->current_stage = 'qc_completed';
            $invoice->save();
        }

        // Log activity
        $description = "QC status updated from '{$oldStatus}' to '{$validated['qc_status']}'";
        if (!empty($validated['notes'])) {
            $description .= " - Notes: {$validated['notes']}";
        }

        InvoiceActivity::create([
            'invoice_id' => $invoice->id,
            'activity_type' => 'qc_update',
            'user_name' => 'System User', // TODO: Replace with actual authenticated user
            'description' => $description,
            'metadata' => [
                'old_status' => $oldStatus,
                'new_status' => $validated['qc_status'],
                'notes' => $validated['notes'] ?? null,
                'scheduled_date' => $validated['scheduled_date'] ?? null,
            ],
        ]);

        // If QC passed and BV is required, automatically trigger BV process
        $message = 'QC status updated successfully';
        if ($validated['qc_status'] === 'passed' && $invoice->requires_bv) {
            // Set BV status to pending to start the BV process
            if ($invoice->bv_status === 'not_required') {
                $invoice->update(['bv_status' => 'pending']);

                // Log the automatic BV initiation
                InvoiceActivity::create([
                    'invoice_id' => $invoice->id,
                    'activity_type' => 'bv_update',
                    'user_name' => 'System',
                    'description' => 'BV inspection automatically initiated after QC passed',
                    'metadata' => [
                        'old_status' => 'not_required',
                        'new_status' => 'pending',
                        'triggered_by' => 'qc_completion',
                    ],
                ]);

                $message .= '. BV inspection process has been automatically initiated.';
            }
        }

        return response()->json([
            'message' => $message,
            'qc_status' => $invoice->qc_status,
            'bv_status' => $invoice->bv_status,
            'current_stage' => $invoice->current_stage,
            'invoice' => $invoice->fresh(['customer', 'supplier', 'documents'])
        ]);
    }

    /**
     * Update BV inspection status
     */
    public function updateBvStatus(Request $request, int $id): JsonResponse
    {
        $invoice = Invoice::findOrFail($id);

        $validated = $request->validate([
            'bv_status' => 'required|string|in:pending,scheduled,in_progress,passed,failed,in_order,blocked',
            'notes' => 'nullable|string|max:1000',
            'scheduled_date' => 'nullable|date',
        ]);

        $oldStatus = $invoice->bv_status;

        // Update BV status
        $invoice->update([
            'bv_status' => $validated['bv_status']
        ]);

        // Add notes to workflow notes if provided
        if (!empty($validated['notes'])) {
            $invoice->workflow_notes = ($invoice->workflow_notes ?? '') . "\n[BV " . now()->toDateTimeString() . "] " . $validated['notes'];
            $invoice->save();
        }

        // If BV passed, mark certificate received
        if ($validated['bv_status'] === 'passed') {
            $invoice->update(['has_bv_certificate' => true]);
        }

        // Log activity
        $description = "BV status updated from '{$oldStatus}' to '{$validated['bv_status']}'";
        if (!empty($validated['notes'])) {
            $description .= " - Notes: {$validated['notes']}";
        }

        InvoiceActivity::create([
            'invoice_id' => $invoice->id,
            'activity_type' => 'bv_update',
            'user_name' => 'System User', // TODO: Replace with actual authenticated user
            'description' => $description,
            'metadata' => [
                'old_status' => $oldStatus,
                'new_status' => $validated['bv_status'],
                'notes' => $validated['notes'] ?? null,
                'scheduled_date' => $validated['scheduled_date'] ?? null,
            ],
        ]);

        return response()->json([
            'message' => 'BV status updated successfully',
            'bv_status' => $invoice->bv_status,
            'invoice' => $invoice->fresh(['customer', 'supplier', 'documents'])
        ]);
    }

    /**
     * Get activities for an invoice
     */
    public function getActivities(int $id): JsonResponse
    {
        $invoice = Invoice::findOrFail($id);

        $activities = InvoiceActivity::where('invoice_id', $id)
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json([
            'success' => true,
            'data' => $activities
        ]);
    }

    /**
     * Mark invoice as ready for transport
     */
    public function markReadyForTransport(Request $request, int $id): JsonResponse
    {
        $invoice = Invoice::findOrFail($id);

        $validated = $request->validate([
            'confirmed' => 'required|boolean',
            'notes' => 'nullable|string|max:1000',
        ]);

        if (!$validated['confirmed']) {
            return response()->json([
                'error' => 'Confirmation is required to mark invoice as ready for transport'
            ], 422);
        }

        // Check if QC/BV requirements are met
        if ($invoice->requires_qc && $invoice->qc_status !== 'passed') {
            return response()->json([
                'error' => 'QC inspection must be completed and passed before marking ready for transport'
            ], 422);
        }

        if ($invoice->requires_bv && $invoice->bv_status !== 'passed') {
            return response()->json([
                'error' => 'BV inspection must be completed and passed before marking ready for transport'
            ], 422);
        }

        // Mark as ready for transport
        $invoice->update([
            'status' => 'approved',
            'ready_dispatch_at' => now(),
            'current_stage' => 'ready_dispatch',
            'can_proceed_to_transport' => true,
        ]);

        // Add notes to workflow notes if provided
        if (!empty($validated['notes'])) {
            $invoice->workflow_notes = ($invoice->workflow_notes ?? '') . "\n[Ready for Transport " . now()->toDateTimeString() . "] " . $validated['notes'];
            $invoice->save();
        }

        // Log activity
        $description = "Invoice marked as ready for transport";
        if (!empty($validated['notes'])) {
            $description .= " - Notes: {$validated['notes']}";
        }

        InvoiceActivity::create([
            'invoice_id' => $invoice->id,
            'activity_type' => 'ready_for_transport',
            'user_name' => 'System User', // TODO: Replace with actual authenticated user
            'description' => $description,
            'metadata' => [
                'notes' => $validated['notes'] ?? null,
                'ready_dispatch_at' => $invoice->ready_dispatch_at,
            ],
        ]);

        return response()->json([
            'message' => 'Invoice marked as ready for transport successfully. It is now queued for Load Confirmation and Manifest creation.',
            'invoice' => $invoice->fresh(['customer', 'supplier', 'documents'])
        ]);
    }

    /**
     * Validate a file name before saving to packing details
     * Checks if file name exists in Load Confirmations or Manifests
     */
    public function validateFileName(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'file_name' => 'required|string',
            'packing_detail_id' => 'nullable|integer', // For edit mode - exclude this record
        ]);

        $fileName = $validated['file_name'];
        $packingDetailId = $validated['packing_detail_id'] ?? null;

        // Check if file name exists in Load Confirmations
        $existsInLoadConfirmation = \App\Models\LoadConfirmation::where('file_reference', $fileName)->exists();

        // Check if file name exists in Manifests
        $existsInManifest = \App\Models\Manifest::where('manifest_number', $fileName)->exists();

        // Check if file name exists in other packing details
        $query = \App\Models\PackingDetail::where('file_name', $fileName);
        if ($packingDetailId) {
            $query->where('id', '!=', $packingDetailId);
        }
        $existsInOtherPackingDetails = $query->exists();

        return response()->json([
            'valid' => !$existsInOtherPackingDetails, // Can use same file name if not locked
            'exists_in_load_confirmation' => $existsInLoadConfirmation,
            'exists_in_manifest' => $existsInManifest,
            'is_locked' => $existsInManifest, // Locked if on manifest
            'status' => $existsInManifest ? 'locked' :
                       ($existsInLoadConfirmation ? 'confirmed' :
                       ($existsInOtherPackingDetails ? 'duplicate' : 'available')),
            'message' => $existsInManifest ?
                'This file name is on a Manifest and cannot be modified.' :
                ($existsInOtherPackingDetails ?
                'Duplicate file names are not allowed.' :
                'File name is available.')
        ]);
    }

    /**
     * Get unique file names from packing details for AUTO TRANSPORT REQUEST
     * Returns file names that are ready for transport request creation
     */
    public function getUniqueFileNames(): JsonResponse
    {
        // Get all packing details with non-empty file_name
        $packingDetails = \App\Models\PackingDetail::with(['invoice.customer', 'invoice.supplier'])
            ->whereNotNull('file_name')
            ->where('file_name', '!=', '')
            ->get();

        // Group by file_name and aggregate data
        $grouped = $packingDetails->groupBy('file_name')->map(function ($details, $fileName) {
            $firstDetail = $details->first();
            $invoice = $firstDetail->invoice;

            // Check if file name already exists in Load Confirmation or Manifest
            $existsInLC = \App\Models\LoadConfirmation::where('file_reference', $fileName)->exists();
            $existsInManifest = \App\Models\Manifest::where('manifest_number', $fileName)->exists();

            // Calculate totals
            $totalCBM = $details->sum('cbm');
            $totalGrossWeight = $details->sum('gross_weight_kg');
            $totalNetWeight = $details->sum('net_weight_kg');
            $packageCount = $details->count();

            return [
                'file_name' => $fileName,
                'package_count' => $packageCount,
                'total_cbm' => round($totalCBM, 6),
                'total_gross_weight_kg' => round($totalGrossWeight, 3),
                'total_net_weight_kg' => round($totalNetWeight, 3),
                'invoice_id' => $invoice->id,
                'invoice_number' => $invoice->invoice_number,
                'customer_name' => $invoice->customer->name ?? null,
                'supplier_name' => $invoice->supplier->name ?? null,
                'collection_address' => $invoice->supplier_address,
                'delivery_address' => $invoice->delivery_address,
                'exit_agent' => $invoice->exit_agent,
                'entry_agent' => $invoice->entry_agent,
                'currency' => $invoice->currency,
                'exists_in_lc' => $existsInLC,
                'exists_in_manifest' => $existsInManifest,
                'status' => $existsInManifest ? 'locked' : ($existsInLC ? 'confirmed' : 'available'),
            ];
        })->values();

        // Filter out locked ones (already on manifest) and confirmed ones (already have LC)
        $available = $grouped->where('status', 'available')->values();

        return response()->json([
            'success' => true,
            'data' => [
                'all' => $grouped,
                'available' => $available,
                'total_count' => $grouped->count(),
                'available_count' => $available->count(),
            ]
        ]);
    }

    /**
     * Create or replace manual packing list for an invoice
     * Used when supplier doesn't provide packing list - generates Altecrete-format PDF
     */
    public function storePackingList(Request $request, int $id): JsonResponse
    {
        $invoice = Invoice::with(['customer', 'supplier'])->findOrFail($id);

        // Validate request
        $validated = $request->validate([
            'packages' => 'required|array|min:1',
            'packages.*.package_type' => 'required|string|max:50',
            'packages.*.quantity' => 'required|integer|min:1',
            'packages.*.description' => 'required|string|max:500',
            'packages.*.weight_per_unit_kg' => 'nullable|numeric|min:0',
            'packages.*.weight_kg' => 'nullable|numeric|min:0',
            'packages.*.dimensions' => 'nullable|array',
            'packages.*.dimensions.length' => 'nullable|numeric|min:0',
            'packages.*.dimensions.width' => 'nullable|numeric|min:0',
            'packages.*.dimensions.height' => 'nullable|numeric|min:0',
        ]);

        // Delete existing packing details for this invoice
        $invoice->packingDetails()->delete();

        $totalGrossWeight = 0;
        $totalNetWeight = 0;
        $totalCBM = 0;

        // Create packing details
        foreach ($validated['packages'] as $index => $package) {
            // Calculate weight
            if (isset($package['weight_per_unit_kg']) && $package['weight_per_unit_kg'] > 0) {
                $grossWeight = $package['quantity'] * $package['weight_per_unit_kg'];
            } elseif (isset($package['weight_kg']) && $package['weight_kg'] > 0) {
                $grossWeight = $package['weight_kg'];
            } else {
                $grossWeight = 0;
            }

            $netWeight = $grossWeight * 0.95; // Assume 95% net weight

            // Calculate CBM if dimensions provided
            $cbm = null;
            $length = $package['dimensions']['length'] ?? null;
            $width = $package['dimensions']['width'] ?? null;
            $height = $package['dimensions']['height'] ?? null;

            if ($length && $width && $height) {
                // Convert cm to meters and calculate CBM
                $cbm = ($length / 100) * ($width / 100) * ($height / 100) * $package['quantity'];
            }

            // Create packing detail record
            \App\Models\PackingDetail::create([
                'invoice_id' => $invoice->id,
                'package_number' => $index + 1,
                'package_type' => $package['package_type'],
                'contents_description' => $package['description'],
                'gross_weight_kg' => $grossWeight,
                'net_weight_kg' => $netWeight,
                'length_cm' => $length,
                'width_cm' => $width,
                'height_cm' => $height,
                'cbm' => $cbm,
                'extracted_data' => [
                    'quantity' => $package['quantity'],
                    'weight_per_unit_kg' => $package['weight_per_unit_kg'] ?? null,
                    'manually_created' => true,
                    'created_by' => 'Manual Entry', // TODO: Replace with auth()->user()->name
                    'created_at' => now()->toISOString(),
                ]
            ]);

            $totalGrossWeight += $grossWeight;
            $totalNetWeight += $netWeight;
            $totalCBM += $cbm ?? 0;
        }

        // Update invoice with total actual weight
        $invoice->update([
            'actual_weight_kg' => $totalGrossWeight
        ]);

        // Calculate weight variance if expected weight exists
        if ($invoice->expected_weight_kg) {
            $invoice->calculateWeightVariance();
            $invoice->save();
        }

        // Log activity
        InvoiceActivity::create([
            'invoice_id' => $invoice->id,
            'activity_type' => 'packing_list_created',
            'user_name' => 'Manual Entry', // TODO: Replace with auth()->user()->name
            'description' => "Manual packing list created with {$validated['packages']} packages, total weight: {$totalGrossWeight} kg",
            'metadata' => [
                'package_count' => count($validated['packages']),
                'total_gross_weight_kg' => round($totalGrossWeight, 3),
                'total_net_weight_kg' => round($totalNetWeight, 3),
                'total_cbm' => round($totalCBM, 6),
            ],
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Packing list created successfully',
            'data' => [
                'package_count' => count($validated['packages']),
                'total_gross_weight_kg' => round($totalGrossWeight, 3),
                'total_net_weight_kg' => round($totalNetWeight, 3),
                'total_cbm' => round($totalCBM, 6),
                'packing_details' => $invoice->fresh()->packingDetails
            ]
        ]);
    }

    /**
     * Get packing list for an invoice
     */
    public function getPackingList(int $id): JsonResponse
    {
        $invoice = Invoice::with(['packingDetails', 'customer', 'supplier'])->findOrFail($id);

        $packingDetails = $invoice->packingDetails;

        // Calculate totals
        $totalGrossWeight = $packingDetails->sum('gross_weight_kg');
        $totalNetWeight = $packingDetails->sum('net_weight_kg');
        $totalCBM = $packingDetails->sum('cbm');

        return response()->json([
            'success' => true,
            'packing_list' => [
                'invoice_id' => $invoice->id,
                'invoice_number' => $invoice->invoice_number,
                'packages' => $packingDetails,
                'totals' => [
                    'package_count' => $packingDetails->count(),
                    'total_gross_weight_kg' => round($totalGrossWeight, 3),
                    'total_net_weight_kg' => round($totalNetWeight, 3),
                    'total_cbm' => round($totalCBM, 6),
                ]
            ]
        ]);
    }

    /**
     * Generate PDF packing list in Altecrete format
     */
    public function generatePackingListPDF(int $id)
    {
        $invoice = Invoice::with([
            'packingDetails',
            'customer',
            'supplier'
        ])->findOrFail($id);

        if ($invoice->packingDetails->isEmpty()) {
            return response()->json([
                'error' => 'No packing details found for this invoice'
            ], 404);
        }

        // Calculate totals
        $totalGrossWeight = $invoice->packingDetails->sum('gross_weight_kg');
        $totalNetWeight = $invoice->packingDetails->sum('net_weight_kg');
        $totalPackages = $invoice->packingDetails->count();

        // Prepare data for PDF
        $data = [
            'invoice' => $invoice,
            'packingDetails' => $invoice->packingDetails,
            'totalGrossWeight' => $totalGrossWeight,
            'totalNetWeight' => $totalNetWeight,
            'totalPackages' => $totalPackages,
            'generatedDate' => now()->format('Y-m-d'),
        ];

        // Generate PDF using DOMPDF
        $pdf = \PDF::loadView('pdf.packing_list_altecrete', $data);
        $pdf->setPaper('A4', 'portrait');

        // Return PDF download
        return $pdf->download("Packing_List_{$invoice->invoice_number}.pdf");
    }

    /**
     * Get all Purchase Orders with budget usage stats
     */
    public function getPurchaseOrders(Request $request): JsonResponse
    {
        $query = Invoice::with(['customer', 'supplier', 'children'])
            ->where('invoice_type', 'purchase_order');

        // Filter by customer
        if ($request->has('customer_id')) {
            $query->where('customer_id', $request->customer_id);
        }

        // Filter by supplier
        if ($request->has('supplier_id')) {
            $query->where('supplier_id', $request->supplier_id);
        }

        // Filter by customer account code (e.g., KAM001)
        if ($request->has('customer_account_code')) {
            $query->where('customer_account_code', $request->customer_account_code);
        }

        $pos = $query->orderBy('created_at', 'desc')->get();

        // Add budget usage stats to each PO
        $posWithStats = $pos->map(function ($po) {
            return [
                'id' => $po->id,
                'invoice_number' => $po->invoice_number,
                'invoice_date' => $po->invoice_date,
                'customer' => $po->customer,
                'supplier' => $po->supplier,
                'customer_reference' => $po->customer_reference,
                'rfq_number' => $po->rfq_number,
                'end_user' => $po->end_user,
                'customer_account_code' => $po->customer_account_code,
                'po_budget_amount' => $po->po_budget_amount,
                'currency' => $po->currency,
                'expected_weight_kg' => $po->expected_weight_kg,
                'customs_declaration_number' => $po->customs_declaration_number,
                'status' => $po->status,
                'created_at' => $po->created_at,
                // Budget usage stats
                'total_usage' => $po->getTotalPOUsage(),
                'usage_percentage' => $po->getPOUsagePercentage(),
                'remaining_budget' => $po->getRemainingPOBudget(),
                'usage_color' => $po->getPOUsageColor(),
                'requires_intervention' => $po->pORequiresIntervention(),
                'linked_invoices_count' => $po->getLinkedInvoices()->count(),
                'linked_licenses_count' => $po->getLinkedLicenses()->count(),
            ];
        });

        return response()->json([
            'success' => true,
            'data' => $posWithStats
        ]);
    }

    /**
     * Get single Purchase Order with full details and usage stats
     */
    public function getPurchaseOrder(int $id): JsonResponse
    {
        $po = Invoice::with([
            'customer',
            'supplier',
            'children.packingDetails',
            'children.documents',
            'lineItems',
            'licenses'
        ])->where('invoice_type', 'purchase_order')
          ->findOrFail($id);

        $linkedInvoices = $po->getLinkedInvoices();

        $data = [
            'id' => $po->id,
            'invoice_number' => $po->invoice_number,
            'invoice_type' => $po->invoice_type,
            'invoice_date' => $po->invoice_date,
            'customer' => $po->customer,
            'supplier' => $po->supplier,
            'customer_reference' => $po->customer_reference,
            'rfq_number' => $po->rfq_number,
            'internal_reference' => $po->internal_reference,
            'end_user' => $po->end_user,
            'customer_account_code' => $po->customer_account_code,
            'tax_reference_number' => $po->tax_reference_number,
            'entry_agent' => $po->entry_agent,
            'import_export_number' => $po->import_export_number,
            'customs_declaration_number' => $po->customs_declaration_number,
            'po_budget_amount' => $po->po_budget_amount,
            'currency' => $po->currency,
            'expected_weight_kg' => $po->expected_weight_kg,
            'exchange_rate' => $po->exchange_rate,
            'exchange_rate_date' => $po->exchange_rate_date,
            'status' => $po->status,
            'created_at' => $po->created_at,
            'updated_at' => $po->updated_at,
            // Budget usage statistics
            'budget_stats' => [
                'total_usage' => $po->getTotalPOUsage(),
                'usage_percentage' => round($po->getPOUsagePercentage(), 2),
                'remaining_budget' => $po->getRemainingPOBudget(),
                'usage_color' => $po->getPOUsageColor(),
                'requires_intervention' => $po->pORequiresIntervention(),
            ],
            // Consumption tracking statistics (for special project POs)
            'consumption_tracking' => $this->getConsumptionTrackingStats($po),
            // Linked commercial invoices
            'linked_invoices' => $linkedInvoices->map(function ($invoice) use ($po) {
                return [
                    'id' => $invoice->id,
                    'invoice_number' => $invoice->invoice_number,
                    'invoice_date' => $invoice->invoice_date,
                    'total_amount' => $invoice->total_amount,
                    'currency' => $invoice->currency,
                    'expected_weight_kg' => $invoice->expected_weight_kg,
                    'actual_weight_kg' => $invoice->actual_weight_kg,
                    'customs_declaration_number' => $invoice->customs_declaration_number,
                    'status' => $invoice->status,
                    'budget_variance' => $invoice->budget_variance,
                    'budget_variance_percentage' => $invoice->budget_variance_percentage,
                    'variance_color' => $invoice->getBudgetVarianceColor(),
                ];
            }),
            // Linked import declarations (licenses) from licenses table
            'licenses' => $po->licenses->map(function ($license) {
                return [
                    'id' => $license->id,
                    'declaration_number' => $license->declaration_number,
                    'validation_number' => $license->validation_number,
                    'bank_name' => $license->bank_name,
                    'validation_date' => $license->validation_date,
                    'expiry_date' => $license->expiry_date,
                    'category' => $license->category,
                    'total_amount' => $license->total_amount,
                    'currency' => $license->currency,
                    'supplier_name' => $license->supplier_name,
                    'country_of_origin' => $license->country_of_origin,
                    'created_at' => $license->created_at,
                    // Expiry tracking
                    'days_until_expiry' => $license->getDaysUntilExpiry(),
                    'is_expiring_soon' => $license->isExpiringSoon(),
                    'is_expired' => $license->isExpired(),
                    'expiry_status_color' => $license->getExpiryStatusColor(),
                    'expiry_status_message' => $license->getExpiryStatusMessage(),
                    // Budget tracking
                    'budget_usage_percentage' => round($license->getBudgetUsagePercentage(), 2),
                    'is_budget_exhausted' => $license->isBudgetExhausted(),
                ];
            }),
            // Line items
            'line_items' => $po->lineItems->map(function ($item) {
                return [
                    'id' => $item->id,
                    'line_number' => $item->line_number,
                    'item_code' => $item->item_code,
                    'description' => $item->description,
                    'quantity' => $item->quantity,
                    'unit_of_measure' => $item->unit_of_measure,
                    'unit_price' => $item->unit_price,
                    'line_total' => $item->line_total,
                    'hs_code' => $item->hs_code,
                    'country_of_origin' => $item->country_of_origin,
                ];
            }),
        ];

        return response()->json($data);
    }

    /**
     * Create a Purchase Order
     */
    public function createPurchaseOrder(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'invoice_number' => 'required|string|unique:invoices',
            'invoice_date' => 'required|date',
            'supplier_id' => 'required|exists:suppliers,id',
            'customer_id' => 'required|exists:customers,id',
            'po_budget_amount' => 'required|numeric|min:0',
            'currency' => 'required|string|max:3',
            'customer_reference' => 'nullable|string',
            'rfq_number' => 'nullable|string',
            'internal_reference' => 'nullable|string',
            'end_user' => 'nullable|string',
            'customer_account_code' => 'nullable|string|max:50',
            'tax_reference_number' => 'nullable|string|max:100',
            'expected_weight_kg' => 'nullable|numeric|min:0',
            'exchange_rate' => 'nullable|numeric|min:0',
            'exchange_rate_date' => 'nullable|date',
        ]);

        // Set PO-specific defaults
        $validated['invoice_type'] = 'purchase_order';
        $validated['total_amount'] = $validated['po_budget_amount']; // For consistency
        $validated['status'] = 'draft';
        $validated['current_owner'] = 'key_accounts_manager';
        $validated['current_stage'] = 'receiving';

        $po = Invoice::create($validated);

        // Log activity
        InvoiceActivity::create([
            'invoice_id' => $po->id,
            'activity_type' => 'po_created',
            'user_name' => 'System User', // TODO: Replace with auth()->user()->name
            'description' => "Purchase Order created: {$po->invoice_number} - Budget: {$po->currency} {$po->po_budget_amount}",
            'metadata' => [
                'po_number' => $po->invoice_number,
                'budget_amount' => $po->po_budget_amount,
                'customer_reference' => $po->customer_reference,
                'end_user' => $po->end_user,
            ],
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Purchase Order created successfully',
            'data' => $po->fresh(['customer', 'supplier'])
        ], 201);
    }

    /**
     * Upload a PO document and send to n8n webhook for processing
     */
    public function uploadPurchaseOrder(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'file' => 'required|file|mimes:pdf,jpg,jpeg,png|max:10240', // 10MB max
        ]);

        try {
            $file = $request->file('file');
            $filename = $file->getClientOriginalName();

            // STEP 1: Save file to storage first
            $storagePath = $file->store('purchase-orders', 'public');
            $fullPath = storage_path('app/public/' . $storagePath);

            // STEP 2: Call existing n8n workflow (workflow creates PO and everything)
            $webhookUrl = env('N8N_PO_UPLOAD_WEBHOOK_URL', 'http://localhost:5678/webhook/po-upload');

            if (!$webhookUrl) {
                return response()->json([
                    'success' => false,
                    'message' => 'n8n webhook URL not configured'
                ], 500);
            }

            $client = new \GuzzleHttp\Client();
            $response = $client->post($webhookUrl, [
                'multipart' => [
                    [
                        'name' => 'file',
                        'contents' => fopen($fullPath, 'r'),
                        'filename' => $filename
                    ],
                    [
                        'name' => 'original_filename',
                        'contents' => $filename
                    ],
                    [
                        'name' => 'uploaded_at',
                        'contents' => now()->toIso8601String()
                    ]
                ],
                'timeout' => 120,
            ]);

            $workflowResult = json_decode($response->getBody()->getContents(), true);

            // STEP 3: Now create document record and link it to the created PO
            $poId = $workflowResult['po_id'] ?? $workflowResult['id'] ?? null;

            if ($poId) {
                $document = Document::create([
                    'invoice_id' => $poId,
                    'document_type' => 'purchase_order',
                    'original_filename' => $filename,
                    'file_path' => $storagePath,
                    'file_size_bytes' => $file->getSize(),
                ]);

                $workflowResult['document_id'] = $document->id;
            }

            return response()->json($workflowResult);

        } catch (\GuzzleHttp\Exception\RequestException $e) {
            \Log::error('n8n webhook error: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'File saved but workflow processing failed: ' . $e->getMessage()
            ], 500);
        } catch (\Exception $e) {
            \Log::error('PO Upload Error: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to upload Purchase Order: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Upload a Commercial Invoice document and send to n8n webhook for processing
     */
    public function uploadCommercialInvoice(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'file' => 'required_without:pdf_base64|file|mimes:pdf,jpg,jpeg,png|max:10240',
            'pdf_base64' => 'required_without:file|string', // Alternative: accept base64
        ]);

        try {
            // Handle either file upload or base64
            if ($request->hasFile('file')) {
                $file = $request->file('file');
                $filename = $file->getClientOriginalName();

                // Save file to storage
                $storagePath = $file->store('commercial-invoices', 'public');
                $fullPath = storage_path('app/public/' . $storagePath);

                // Read file for webhook
                $fileContents = file_get_contents($fullPath);
                $base64 = base64_encode($fileContents);
            } else if ($request->has('pdf_base64')) {
                $base64 = $request->input('pdf_base64');
                $filename = 'invoice_' . time() . '.pdf';

                // Save base64 to file
                $fileContents = base64_decode($base64);
                $storagePath = 'commercial-invoices/' . $filename;
                Storage::disk('public')->put($storagePath, $fileContents);
            } else {
                return response()->json([
                    'success' => false,
                    'message' => 'No file or pdf_base64 provided'
                ], 422);
            }

            // Call n8n workflow for AI extraction
            $webhookUrl = env('N8N_COMMERCIAL_INVOICE_WEBHOOK_URL', 'http://localhost:5678/webhook/commercial-invoice-upload');

            $client = new \GuzzleHttp\Client();
            $response = $client->post($webhookUrl, [
                'json' => [
                    'pdf_base64' => $base64,
                    'original_filename' => $filename,
                    'uploaded_at' => now()->toIso8601String()
                ],
                'timeout' => 120,
            ]);

            $workflowResult = json_decode($response->getBody()->getContents(), true);

            // Create document record and link it to the created invoice
            $invoiceId = $workflowResult['invoice_id'] ?? $workflowResult['id'] ?? null;

            if ($invoiceId) {
                $document = Document::create([
                    'invoice_id' => $invoiceId,
                    'document_type' => 'invoice',
                    'original_filename' => $filename,
                    'file_path' => $storagePath,
                    'file_size_bytes' => strlen($fileContents ?? $base64),
                ]);

                $workflowResult['document_id'] = $document->id;
            }

            return response()->json($workflowResult);

        } catch (\GuzzleHttp\Exception\RequestException $e) {
            \Log::error('n8n webhook error: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'File saved but workflow processing failed: ' . $e->getMessage()
            ], 500);
        } catch (\Exception $e) {
            \Log::error('Commercial Invoice Upload Error: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to upload Commercial Invoice: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Check if packing list exists and if auto-generation is possible
     */
    public function checkPackagingRules($invoiceId): JsonResponse
    {
        $invoice = Invoice::with('supplier')->find($invoiceId);

        if (!$invoice) {
            return response()->json([
                'error' => 'Invoice not found'
            ], 404);
        }

        $packingCount = \DB::table('packing_details')
            ->where('invoice_id', $invoiceId)
            ->count();

        $rulesCount = \DB::table('product_packaging_rules')
            ->where('supplier_name', $invoice->supplier->name)
            ->count();

        $action = $packingCount > 0 ? 'display_existing' : ($rulesCount > 0 ? 'auto_generate' : 'manual_entry');

        return response()->json([
            'invoice_id' => $invoice->id,
            'invoice_number' => $invoice->invoice_number,
            'supplier_name' => $invoice->supplier->name,
            'has_packing_list' => $packingCount > 0,
            'packing_list_count' => $packingCount,
            'can_auto_generate' => $rulesCount > 0,
            'packaging_rules_count' => $rulesCount,
            'action' => $action
        ]);
    }

    /**
     * Auto-generate packing list based on packaging rules
     */
    public function generatePackingList($id): JsonResponse
    {
        $invoice = Invoice::with(['supplier', 'lineItems'])->find($id);

        if (!$invoice) {
            return response()->json([
                'success' => false,
                'message' => 'Invoice not found'
            ], 404);
        }

        // Check if packing list already exists - prevent duplicate generation
        $existingCount = \DB::table('packing_details')
            ->where('invoice_id', $id)
            ->count();

        if ($existingCount > 0) {
            return response()->json([
                'success' => true,
                'message' => 'Packing list already exists',
                'invoice_id' => $id,
                'invoice_number' => $invoice->invoice_number,
                'packages_created' => 0,
                'existing_packages' => $existingCount,
                'packages' => []
            ]);
        }

        $packages = [];
        $packageNumber = 1;

        foreach ($invoice->lineItems as $lineItem) {
            // Find matching packaging rule - check if line item matches the rule's pattern
            $rule = \DB::table('product_packaging_rules')
                ->where('supplier_name', $invoice->supplier->name)
                ->where(function($query) use ($lineItem) {
                    // Check if line item code starts with rule's item_code
                    $query->whereRaw('? LIKE CONCAT(item_code, "%")', [$lineItem->item_code])
                          // OR check if line item description matches the pattern
                          ->orWhereRaw('? LIKE item_description_pattern', [$lineItem->description]);
                })
                ->first();

            if ($rule) {
                $quantity = $lineItem->quantity;

                // Determine if quantity represents discrete units or total weight
                // Check if item code or description contains weight pattern (e.g., "1000kg", "500kg")
                $isDiscreteUnit = preg_match('/\d+\s*kg/i', $lineItem->item_code . ' ' . $lineItem->description);

                if ($isDiscreteUnit) {
                    // Quantity represents number of discrete packages (e.g., 30 bags)
                    $numPackages = (int) $quantity;
                } else {
                    // Quantity represents total kg/litres (e.g., 1000L = 1 flowbin of 1000L)
                    // For liquids: assume 1L = 1kg, so quantity in litres = weight in kg
                    $numPackages = ceil($quantity / $rule->weight_per_unit_kg);
                }

                // Group identical packages together with quantity field
                $cbm = ($rule->length_cm * $rule->width_cm * $rule->height_cm) / 1000000;
                $volumetricWeight = $cbm * 167;

                $packages[] = [
                    'invoice_id' => $id,
                    'package_number' => $packageNumber,
                    'quantity' => $numPackages, // Store quantity instead of creating multiple rows
                    'package_type' => $rule->package_type,
                    'length_cm' => $rule->length_cm,
                    'width_cm' => $rule->width_cm,
                    'height_cm' => $rule->height_cm,
                    'cbm' => round($cbm, 6),
                    'gross_weight_kg' => $rule->weight_per_unit_kg,
                    'net_weight_kg' => $rule->weight_per_unit_kg * 0.95,
                    'volumetric_weight_kg' => round($volumetricWeight, 3),
                    'contents_description' => $lineItem->description . ' (' . round($rule->weight_per_unit_kg, 0) . 'kg)',
                    'file_name' => null, // Auto-generated packages have no file_name
                    'created_at' => now(),
                    'updated_at' => now()
                ];

                // Increment package number by the quantity for the next group
                $packageNumber += $numPackages;
            }
        }

        if (count($packages) > 0) {
            \DB::table('packing_details')->insert($packages);
        }

        return response()->json([
            'success' => true,
            'message' => 'Packing list generated',
            'invoice_id' => $id,
            'invoice_number' => $invoice->invoice_number,
            'packages_created' => count($packages),
            'packages' => $packages
        ]);
    }

    /**
     * Get consumption tracking statistics for a PO
     * Helper method with error handling
     */
    private function getConsumptionTrackingStats(Invoice $po): array
    {
        try {
            if (!$po->track_consumption) {
                return [
                    'enabled' => false,
                    'ordered_quantity_tons' => $po->ordered_quantity_tons,
                    'tracked_item_code' => $po->tracked_item_code,
                    'tracked_supplier_code' => $po->tracked_supplier_code,
                    'consumed_tons' => 0,
                    'consumption_percentage' => 0,
                    'remaining_quantity_tons' => 0,
                    'consumption_rate' => 0,
                    'estimated_days_to_completion' => null,
                    'consumption_color' => 'default',
                ];
            }

            return [
                'enabled' => true,
                'ordered_quantity_tons' => $po->ordered_quantity_tons,
                'tracked_item_code' => $po->tracked_item_code,
                'tracked_supplier_code' => $po->tracked_supplier_code,
                'consumed_tons' => $po->getConsumedTons(),
                'calculated_tons' => $po->getCalculatedTons(),
                'actual_tons' => $po->getActualTons(),
                'consumption_percentage' => round($po->getConsumptionPercentage(), 2),
                'remaining_quantity_tons' => $po->getRemainingQuantityTons(),
                'consumption_rate' => $po->getConsumptionRate(),
                'estimated_days_to_completion' => $po->getEstimatedDaysToCompletion(),
                'consumption_color' => $po->getConsumptionColor(),
            ];
        } catch (\Exception $e) {
            \Log::error('Consumption tracking calculation error for PO ' . $po->id . ': ' . $e->getMessage());
            return [
                'enabled' => $po->track_consumption ?? false,
                'ordered_quantity_tons' => $po->ordered_quantity_tons,
                'tracked_item_code' => $po->tracked_item_code,
                'tracked_supplier_code' => $po->tracked_supplier_code,
                'consumed_tons' => 0,
                'consumption_percentage' => 0,
                'remaining_quantity_tons' => 0,
                'consumption_rate' => 0,
                'estimated_days_to_completion' => null,
                'consumption_color' => 'default',
                'error' => 'Failed to calculate consumption metrics',
            ];
        }
    }

    /**
     * Sync invoice_load_confirmation relationships based on packing_details.file_name values
     * This allows many-to-many: one invoice can have packages on multiple load confirmations
     */
    private function syncLoadConfirmationRelationships(Invoice $invoice): void
    {
        // Get all unique non-null file_name values from this invoice's packing details
        $fileNames = $invoice->packingDetails()
            ->whereNotNull('file_name')
            ->where('file_name', '!=', '')
            ->distinct()
            ->pluck('file_name');

        if ($fileNames->isEmpty()) {
            // No file names assigned, detach all load confirmations
            $invoice->loadConfirmations()->detach();
            \Log::info("Removed all load confirmation links for invoice {$invoice->id} (no file names assigned)");
            return;
        }

        // Find load confirmations by file_reference
        $loadConfirmationIds = \App\Models\LoadConfirmation::whereIn('file_reference', $fileNames)
            ->pluck('id')
            ->toArray();

        if (empty($loadConfirmationIds)) {
            // No matching load confirmations found
            $invoice->loadConfirmations()->detach();
            \Log::warning("No load confirmations found for file names: " . $fileNames->implode(', ') . " for invoice {$invoice->id}");
            return;
        }

        // Sync the relationships (adds new, removes old, keeps existing)
        $invoice->loadConfirmations()->sync($loadConfirmationIds);

        \Log::info("Synced load confirmations for invoice {$invoice->id}: " . implode(', ', $loadConfirmationIds) . " based on file names: " . $fileNames->implode(', '));
    }
}
