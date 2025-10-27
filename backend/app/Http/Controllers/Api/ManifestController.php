<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Manifest;
use App\Models\Invoice;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Barryvdh\DomPDF\Facade\Pdf;
use SimpleSoftwareIO\QrCode\Facades\QrCode;

class ManifestController extends Controller
{
    /**
     * Get all manifests
     */
    public function index(): JsonResponse
    {
        $manifests = Manifest::with([
            'loadConfirmation.transporter',
            'invoices.customer',
            'invoices.supplier',
            'invoices.packingDetails'
        ])
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
            'invoices.supplier',
            'invoices.packingDetails'
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
            'border_post' => 'nullable|string',
            'customs_office' => 'nullable|string',
            'contract_number' => 'nullable|string',
            'area_and_phase' => 'nullable|string',
            'project_code' => 'nullable|string',
            'driver_instruction_1' => 'nullable|string',
            'driver_instruction_2' => 'nullable|string',
            'invoice_ids' => 'required|array',
            'invoice_ids.*' => 'exists:invoices,id',
            // Load confirmation fields to update
            'clearing_agent' => 'nullable|string',
            'entry_agent' => 'nullable|string',
            'commodity_description' => 'nullable|string',
        ]);

        // Create manifest
        $manifest = Manifest::create([
            'manifest_number' => $validated['manifest_number'],
            'load_confirmation_id' => $validated['load_confirmation_id'],
            'export_date' => $validated['export_date'],
            'border_post' => $validated['border_post'] ?? null,
            'customs_office' => $validated['customs_office'] ?? null,
            'contract_number' => $validated['contract_number'] ?? null,
            'area_and_phase' => $validated['area_and_phase'] ?? null,
            'project_code' => $validated['project_code'] ?? null,
            'driver_instruction_1' => $validated['driver_instruction_1'] ?? null,
            'driver_instruction_2' => $validated['driver_instruction_2'] ?? null,
            'customs_status' => 'pending',
            'status' => 'draft',
        ]);

        // Update load confirmation fields if provided
        if (isset($validated['clearing_agent']) || isset($validated['entry_agent']) || isset($validated['commodity_description'])) {
            $loadConfirmation = \App\Models\LoadConfirmation::find($validated['load_confirmation_id']);
            if ($loadConfirmation) {
                $updateData = [];
                if (isset($validated['clearing_agent'])) {
                    $updateData['clearing_agent'] = $validated['clearing_agent'];
                }
                if (isset($validated['entry_agent'])) {
                    $updateData['entry_agent'] = $validated['entry_agent'];
                }
                if (isset($validated['commodity_description'])) {
                    $updateData['commodity_description'] = $validated['commodity_description'];
                }
                $loadConfirmation->update($updateData);
            }
        }

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

        return response()->json($manifest->load([
            'loadConfirmation.transporter',
            'invoices.customer',
            'invoices.supplier',
            'invoices.packingDetails'
        ]), 201);
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

    /**
     * Download manifest as PDF
     */
    public function downloadPdf(int $id)
    {
        $manifest = Manifest::with([
            'loadConfirmation.transporter',
            'invoices.customer',
            'invoices.supplier',
            'invoices.packingDetails'
        ])->findOrFail($id);

        $loadConfirmation = $manifest->loadConfirmation;

        // Generate QR code as SVG (doesn't require imagick extension)
        $qrCode = QrCode::size(200)
            ->margin(0)
            ->generate($manifest->manifest_number);

        // Generate PDF
        $pdf = Pdf::loadView('pdf.manifest', [
            'manifest' => $manifest,
            'loadConfirmation' => $loadConfirmation,
            'qrCode' => $qrCode,
        ]);

        // Set paper size and orientation to landscape
        $pdf->setPaper('a4', 'landscape');

        // Download with filename using manifest number
        $filename = 'Manifest_' . $manifest->manifest_number . '.pdf';

        return $pdf->download($filename);
    }
}
