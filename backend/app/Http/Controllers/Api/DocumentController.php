<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Document;
use App\Models\Invoice;
use App\Models\InvoiceActivity;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Storage;

class DocumentController extends Controller
{
    /**
     * Get all documents for an invoice
     */
    public function index(int $invoiceId): JsonResponse
    {
        $documents = Document::where('invoice_id', $invoiceId)
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json($documents);
    }

    /**
     * Get a single document
     */
    public function show(int $id): JsonResponse
    {
        $document = Document::with('invoice')->findOrFail($id);
        return response()->json($document);
    }

    /**
     * Upload a document
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'invoice_id' => 'required|exists:invoices,id',
            'document_type' => 'required|string',
            'document_subtype' => 'nullable|string',
            'file' => 'required|file|max:20480', // 20MB max
            'extracted_data' => 'nullable|array',
            'classification_confidence' => 'nullable|numeric|min:0|max:1',
        ]);

        $file = $request->file('file');
        $filename = time() . '_' . $file->getClientOriginalName();
        $path = $file->storeAs('documents', $filename, 'public');

        $document = Document::create([
            'invoice_id' => $validated['invoice_id'],
            'document_type' => $validated['document_type'],
            'document_subtype' => $validated['document_subtype'] ?? null,
            'original_filename' => $file->getClientOriginalName(),
            'file_path' => $path,
            'file_size_bytes' => $file->getSize(),
            'extracted_data' => $validated['extracted_data'] ?? null,
            'classification_confidence' => $validated['classification_confidence'] ?? null,
            'uploaded_by' => auth()->id() ?? null,
        ]);

        // Update invoice workflow status
        $invoice = Invoice::find($validated['invoice_id']);
        if ($invoice) {
            $invoice->updateWorkflowStatus();
        }

        // Log activity
        InvoiceActivity::create([
            'invoice_id' => $validated['invoice_id'],
            'activity_type' => 'document_upload',
            'user_name' => 'System User', // TODO: Replace with actual authenticated user
            'description' => "Document uploaded: {$document->original_filename} (Type: {$document->document_type})",
            'metadata' => [
                'document_id' => $document->id,
                'document_type' => $document->document_type,
                'document_subtype' => $document->document_subtype,
                'filename' => $document->original_filename,
                'file_size' => $document->file_size_bytes,
            ],
        ]);

        return response()->json($document, 201);
    }

    /**
     * Update document metadata (not the file itself)
     */
    public function update(Request $request, int $id): JsonResponse
    {
        $document = Document::findOrFail($id);

        $validated = $request->validate([
            'document_type' => 'string',
            'document_subtype' => 'nullable|string',
            'extracted_data' => 'nullable|array',
            'classification_confidence' => 'nullable|numeric|min:0|max:1',
        ]);

        $document->update($validated);

        // Update invoice workflow status
        if ($document->invoice) {
            $document->invoice->updateWorkflowStatus();
        }

        return response()->json($document);
    }

    /**
     * Delete a document
     */
    public function destroy(int $id): JsonResponse
    {
        $document = Document::findOrFail($id);

        // Delete file from storage
        if (Storage::disk('public')->exists($document->file_path)) {
            Storage::disk('public')->delete($document->file_path);
        }

        $invoiceId = $document->invoice_id;
        $document->delete();

        // Update invoice workflow status
        $invoice = Invoice::find($invoiceId);
        if ($invoice) {
            $invoice->updateWorkflowStatus();
        }

        return response()->json(['message' => 'Document deleted successfully']);
    }

    /**
     * Download a document
     */
    public function download(int $id)
    {
        $document = Document::findOrFail($id);

        if (!Storage::disk('public')->exists($document->file_path)) {
            return response()->json(['error' => 'File not found'], 404);
        }

        return Storage::disk('public')->download(
            $document->file_path,
            $document->original_filename
        );
    }

    /**
     * Mark certificate as received (QC/BV)
     */
    public function markCertificate(Request $request, int $id): JsonResponse
    {
        $document = Document::findOrFail($id);

        $validated = $request->validate([
            'certificate_type' => 'required|in:qc,bv,feri',
        ]);

        if (!$document->invoice) {
            return response()->json(['error' => 'Invoice not found'], 404);
        }

        // Update invoice certificate flags
        $field = 'has_' . $validated['certificate_type'] . '_certificate';
        $document->invoice->update([$field => true]);

        // Update workflow status
        $document->invoice->updateWorkflowStatus();

        return response()->json([
            'message' => 'Certificate marked as received',
            'invoice' => $document->invoice->fresh()
        ]);
    }

    /**
     * Upload document to invoice (simplified upload route)
     */
    public function uploadToInvoice(Request $request, int $id): JsonResponse
    {
        $invoice = Invoice::findOrFail($id);

        $validated = $request->validate([
            'document_type' => 'required|string',
            'file' => 'required|file|mimes:pdf|max:20480', // 20MB max PDF only
        ]);

        $file = $request->file('file');
        $filename = time() . '_' . $file->getClientOriginalName();
        $path = $file->storeAs('documents/invoices/' . $invoice->id, $filename, 'public');

        $document = Document::create([
            'invoice_id' => $invoice->id,
            'document_type' => $validated['document_type'],
            'document_subtype' => null,
            'original_filename' => $file->getClientOriginalName(),
            'file_path' => $path,
            'file_size_bytes' => $file->getSize(),
            'extracted_data' => null,
            'classification_confidence' => 1.0,
            'uploaded_by' => auth()->id() ?? null,
        ]);

        // Update invoice workflow status if it's a certificate
        if (in_array($validated['document_type'], ['qc_certificate', 'bv_certificate', 'feri_certificate'])) {
            $certType = str_replace('_certificate', '', $validated['document_type']);
            $field = 'has_' . $certType . '_certificate';
            $invoice->update([$field => true]);
            $invoice->updateWorkflowStatus();
        }

        // Log activity
        InvoiceActivity::create([
            'invoice_id' => $invoice->id,
            'activity_type' => 'document_upload',
            'user_name' => 'System User', // TODO: Replace with actual authenticated user
            'description' => "Document uploaded: {$document->original_filename} (Type: {$validated['document_type']})",
            'metadata' => [
                'document_id' => $document->id,
                'document_type' => $validated['document_type'],
                'filename' => $document->original_filename,
                'file_size' => $document->file_size_bytes,
            ],
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Document uploaded successfully',
            'document' => $document
        ], 201);
    }

    /**
     * View/display document in browser
     */
    public function view(int $id)
    {
        $document = Document::findOrFail($id);

        if (!Storage::disk('public')->exists($document->file_path)) {
            return response()->json(['error' => 'File not found'], 404);
        }

        return response()->file(
            Storage::disk('public')->path($document->file_path),
            ['Content-Type' => 'application/pdf']
        );
    }
}
