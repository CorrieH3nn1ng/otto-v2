<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Manifest;
use App\Models\Invoice;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class ManifestController extends Controller
{
    /**
     * Get all manifests
     */
    public function index(): JsonResponse
    {
        $manifests = Manifest::with(['loadConfirmation.transporter', 'invoices'])
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json($manifests);
    }

    /**
     * Get a single manifest
     */
    public function show(int $id): JsonResponse
    {
        $manifest = Manifest::with([
            'loadConfirmation.transporter',
            'invoices.customer',
            'invoices.supplier'
        ])->findOrFail($id);

        return response()->json($manifest);
    }

    /**
     * Create a manifest (Key Accounts Manager creates from load confirmations)
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'manifest_number' => 'required|string|unique:manifests',
            'load_confirmation_id' => 'required|exists:load_confirmations,id',
            'export_date' => 'required|date',
            'invoice_ids' => 'required|array',
            'invoice_ids.*' => 'exists:invoices,id',
        ]);

        // Create manifest
        $manifest = Manifest::create([
            'manifest_number' => $validated['manifest_number'],
            'load_confirmation_id' => $validated['load_confirmation_id'],
            'export_date' => $validated['export_date'],
            'customs_status' => 'pending',
            'status' => 'draft',
        ]);

        // Attach invoices to manifest
        $manifest->invoices()->attach($validated['invoice_ids']);

        // Update invoice workflow
        foreach ($validated['invoice_ids'] as $invoiceId) {
            $invoice = Invoice::find($invoiceId);
            if ($invoice) {
                $invoice->update([
                    'current_stage' => 'manifest_created',
                    'current_owner' => $invoice->requires_feri ? 'feri_department' : 'operations',
                ]);
            }
        }

        return response()->json($manifest->load(['loadConfirmation', 'invoices']), 201);
    }

    /**
     * Update a manifest
     */
    public function update(Request $request, int $id): JsonResponse
    {
        $manifest = Manifest::findOrFail($id);

        $validated = $request->validate([
            'manifest_number' => 'string|unique:manifests,manifest_number,' . $id,
            'load_confirmation_id' => 'exists:load_confirmations,id',
            'export_date' => 'date',
            'customs_status' => 'string',
            'feri_application_date' => 'nullable|date',
            'certificate_of_destination_date' => 'nullable|date',
            'status' => 'string',
        ]);

        $manifest->update($validated);

        return response()->json($manifest);
    }

    /**
     * Delete a manifest
     */
    public function destroy(int $id): JsonResponse
    {
        $manifest = Manifest::findOrFail($id);

        // Revert invoice workflow state
        foreach ($manifest->invoices as $invoice) {
            $invoice->update([
                'current_stage' => 'transport_arranged',
                'current_owner' => 'key_accounts_manager',
            ]);
        }

        $manifest->delete();

        return response()->json(['message' => 'Manifest deleted successfully']);
    }

    /**
     * Submit manifest for FERI processing
     */
    public function submitFeri(int $id): JsonResponse
    {
        $manifest = Manifest::findOrFail($id);

        $manifest->update([
            'status' => 'pending_feri',
            'feri_application_date' => now(),
        ]);

        // Update all invoices in manifest
        foreach ($manifest->invoices as $invoice) {
            $invoice->update([
                'current_stage' => 'feri_pending',
                'current_owner' => 'feri_department',
            ]);
        }

        return response()->json([
            'message' => 'Manifest submitted for FERI processing',
            'manifest' => $manifest->fresh()
        ]);
    }

    /**
     * Approve FERI for manifest
     */
    public function approveFeri(Request $request, int $id): JsonResponse
    {
        $manifest = Manifest::findOrFail($id);

        $validated = $request->validate([
            'certificate_of_destination_date' => 'required|date',
        ]);

        $manifest->update([
            'status' => 'feri_approved',
            'certificate_of_destination_date' => $validated['certificate_of_destination_date'],
        ]);

        // Update all invoices in manifest
        foreach ($manifest->invoices as $invoice) {
            $invoice->update([
                'current_stage' => 'in_transit',
                'current_owner' => 'operations',
                'has_feri_certificate' => true,
            ]);
        }

        return response()->json([
            'message' => 'FERI approved successfully',
            'manifest' => $manifest->fresh()
        ]);
    }

    /**
     * Mark manifest as delivered
     */
    public function markDelivered(int $id): JsonResponse
    {
        $manifest = Manifest::findOrFail($id);

        $manifest->update([
            'status' => 'delivered',
        ]);

        // Update all invoices in manifest
        foreach ($manifest->invoices as $invoice) {
            $invoice->update([
                'current_stage' => 'delivered',
                'current_owner' => 'finance',
                'status' => 'completed',
            ]);
        }

        return response()->json([
            'message' => 'Manifest marked as delivered',
            'manifest' => $manifest->fresh()
        ]);
    }

    /**
     * Attach invoices to manifest
     */
    public function attachInvoices(Request $request, int $id): JsonResponse
    {
        $manifest = Manifest::findOrFail($id);

        $validated = $request->validate([
            'invoice_ids' => 'required|array',
            'invoice_ids.*' => 'exists:invoices,id',
        ]);

        $manifest->invoices()->syncWithoutDetaching($validated['invoice_ids']);

        return response()->json([
            'message' => 'Invoices attached successfully',
            'manifest' => $manifest->load('invoices')
        ]);
    }

    /**
     * Detach invoices from manifest
     */
    public function detachInvoices(Request $request, int $id): JsonResponse
    {
        $manifest = Manifest::findOrFail($id);

        $validated = $request->validate([
            'invoice_ids' => 'required|array',
            'invoice_ids.*' => 'exists:invoices,id',
        ]);

        $manifest->invoices()->detach($validated['invoice_ids']);

        return response()->json([
            'message' => 'Invoices detached successfully',
            'manifest' => $manifest->load('invoices')
        ]);
    }
}
