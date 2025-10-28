<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Manifest;
use App\Models\Invoice;
use App\Models\Document;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Storage;
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
            'invoices.packingDetails',
            'invoices.documents'
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
            'invoices.packingDetails',
            'invoices.documents',
            'documents'
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

        // Update packing details file_name for all newly attached invoices
        foreach ($validated['invoice_ids'] as $invoiceId) {
            $updatedCount = \DB::table('packing_details')
                ->where('invoice_id', $invoiceId)
                ->update(['file_name' => $manifest->manifest_number]);

            \Log::info("Updated {$updatedCount} packing_details records for invoice {$invoiceId} with file_name '{$manifest->manifest_number}'");
        }

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

        // Clear packing details file_name for detached invoices
        foreach ($validated['invoice_ids'] as $invoiceId) {
            $updatedCount = \DB::table('packing_details')
                ->where('invoice_id', $invoiceId)
                ->where('file_name', $manifest->manifest_number)
                ->update(['file_name' => null]);

            \Log::info("Cleared file_name from {$updatedCount} packing_details records for invoice {$invoiceId}");
        }

        return response()->json([
            'message' => 'Invoices detached successfully',
            'manifest' => $manifest->load('invoices')
        ]);
    }

    /**
     * Attach specific packages to manifest
     */
    public function attachPackages(Request $request, int $id): JsonResponse
    {
        $manifest = Manifest::findOrFail($id);

        $validated = $request->validate([
            'package_ids' => 'required|array',
            'package_ids.*' => 'exists:packing_details,id',
        ]);

        // Update file_name for selected packages only
        $updatedCount = \DB::table('packing_details')
            ->whereIn('id', $validated['package_ids'])
            ->update(['file_name' => $manifest->manifest_number]);

        \Log::info("Updated {$updatedCount} packing_details records with file_name '{$manifest->manifest_number}'");

        // Get unique invoice IDs from the packages
        $invoiceIds = \DB::table('packing_details')
            ->whereIn('id', $validated['package_ids'])
            ->pluck('invoice_id')
            ->unique()
            ->toArray();

        // Sync invoice relationships (without detaching existing)
        $manifest->invoices()->syncWithoutDetaching($invoiceIds);

        return response()->json([
            'message' => 'Packages attached successfully',
            'manifest' => $manifest->fresh()->load('invoices.packingDetails')
        ]);
    }

    /**
     * Detach specific packages from manifest
     */
    public function detachPackages(Request $request, int $id): JsonResponse
    {
        $manifest = Manifest::findOrFail($id);

        $validated = $request->validate([
            'package_ids' => 'required|array',
            'package_ids.*' => 'exists:packing_details,id',
        ]);

        // Clear file_name for selected packages only
        $updatedCount = \DB::table('packing_details')
            ->whereIn('id', $validated['package_ids'])
            ->where('file_name', $manifest->manifest_number)
            ->update(['file_name' => null]);

        \Log::info("Cleared file_name from {$updatedCount} packing_details records");

        // Check if any packages from their invoices are still on this manifest
        $packageInvoiceIds = \DB::table('packing_details')
            ->whereIn('id', $validated['package_ids'])
            ->pluck('invoice_id')
            ->unique();

        foreach ($packageInvoiceIds as $invoiceId) {
            // Count remaining packages from this invoice on this manifest
            $remainingPackages = \DB::table('packing_details')
                ->where('invoice_id', $invoiceId)
                ->where('file_name', $manifest->manifest_number)
                ->count();

            // If no packages left, detach the invoice relationship
            if ($remainingPackages === 0) {
                $manifest->invoices()->detach($invoiceId);
                \Log::info("Detached invoice {$invoiceId} from manifest as no packages remain");
            }
        }

        return response()->json([
            'message' => 'Packages detached successfully',
            'manifest' => $manifest->fresh()->load('invoices.packingDetails')
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

    /**
     * Get all documents for a manifest
     */
    public function getDocuments(int $id): JsonResponse
    {
        $manifest = Manifest::findOrFail($id);
        $documents = $manifest->documents()->orderBy('created_at', 'desc')->get();

        return response()->json($documents);
    }

    /**
     * Upload a document to a manifest
     */
    public function uploadDocument(Request $request, int $id): JsonResponse
    {
        $manifest = Manifest::findOrFail($id);

        $validated = $request->validate([
            'document_type' => 'required|string|in:invoice,packing_list,bv_report,freight_statement,validated_feri,insurance,manifest,other',
            'document_subtype' => 'nullable|string',
            'file' => 'required|file|mimes:pdf,jpg,jpeg,png|max:20480', // 20MB max
        ]);

        $file = $request->file('file');
        $filename = time() . '_' . $file->getClientOriginalName();
        $path = $file->storeAs('documents/manifests/' . $manifest->id, $filename, 'public');

        $document = Document::create([
            'manifest_id' => $manifest->id,
            'document_type' => $validated['document_type'],
            'document_subtype' => $validated['document_subtype'] ?? null,
            'original_filename' => $file->getClientOriginalName(),
            'file_path' => $path,
            'file_size_bytes' => $file->getSize(),
            'classification_confidence' => 1.0,
            'uploaded_by' => auth()->id() ?? null,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Document uploaded successfully',
            'document' => $document
        ], 201);
    }

    /**
     * Delete a document from a manifest
     */
    public function deleteDocument(int $manifestId, int $documentId): JsonResponse
    {
        $manifest = Manifest::findOrFail($manifestId);
        $document = Document::where('manifest_id', $manifest->id)
            ->where('id', $documentId)
            ->firstOrFail();

        // Delete file from storage
        if (Storage::disk('public')->exists($document->file_path)) {
            Storage::disk('public')->delete($document->file_path);
        }

        $document->delete();

        return response()->json([
            'success' => true,
            'message' => 'Document deleted successfully'
        ]);
    }

    /**
     * Download a manifest document
     */
    public function downloadDocument(int $manifestId, int $documentId)
    {
        $manifest = Manifest::findOrFail($manifestId);
        $document = Document::where('manifest_id', $manifest->id)
            ->where('id', $documentId)
            ->firstOrFail();

        if (!Storage::disk('public')->exists($document->file_path)) {
            return response()->json(['error' => 'File not found'], 404);
        }

        return Storage::disk('public')->download(
            $document->file_path,
            $document->original_filename
        );
    }
}
