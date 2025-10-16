<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Invoice;
use App\Models\InvoiceActivity;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class InvoiceController extends Controller
{
    /**
     * Get all invoices with optional filtering by owner/stage
     */
    public function index(Request $request): JsonResponse
    {
        $query = Invoice::with(['customer', 'supplier', 'documents']);

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

        return response()->json($invoiceArray);
    }

    /**
     * Create a new invoice
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'invoice_number' => 'required|string|unique:invoices',
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
        ]);

        // Set initial workflow state
        $validated['current_owner'] = 'key_accounts_manager';
        $validated['current_stage'] = 'invoice_received';
        $validated['status'] = 'draft';
        $validated['can_proceed_to_transport'] = false;
        $validated['blocked_waiting_for_documents'] = true;

        $invoice = Invoice::create($validated);

        return response()->json($invoice, 201);
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
        }

        // Handle line items updates
        if (isset($validated['line_items'])) {
            foreach ($validated['line_items'] as $lineItemData) {
                if (isset($lineItemData['id'])) {
                    // Update existing line item
                    $lineItem = \App\Models\LineItem::find($lineItemData['id']);
                    if ($lineItem && $lineItem->invoice_id === $invoice->id) {
                        $lineItem->update($lineItemData);
                    }
                } else {
                    // Create new line item
                    $invoice->lineItems()->create($lineItemData);
                }
            }
        }

        // Return fresh invoice with relationships
        return response()->json($invoice->fresh([
            'packingDetails',
            'lineItems',
            'customer',
            'supplier',
            'documents'
        ]));
    }

    /**
     * Delete an invoice (soft delete)
     */
    public function destroy(int $id): JsonResponse
    {
        $invoice = Invoice::findOrFail($id);
        $invoice->delete();

        return response()->json(['message' => 'Invoice deleted successfully']);
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
            'total_invoices' => Invoice::count(),
            'draft' => Invoice::where('status', 'draft')->count(),
            'pending_approval' => Invoice::where('status', 'pending_approval')->count(),
            'approved' => Invoice::where('status', 'approved')->count(),
            'in_transit' => Invoice::where('status', 'in_transit')->count(),
            'delivered' => Invoice::where('status', 'delivered')->count(),
            'blocked_documents' => Invoice::where('blocked_waiting_for_documents', true)->count(),
            'blocked_transport' => Invoice::where('blocked_waiting_for_transport_planner', true)->count(),
            'awaiting_qc' => Invoice::where('requires_qc', true)
                ->where('has_qc_certificate', false)->count(),
            'awaiting_bv' => Invoice::where('requires_bv', true)
                ->where('has_bv_certificate', false)->count(),
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
}
