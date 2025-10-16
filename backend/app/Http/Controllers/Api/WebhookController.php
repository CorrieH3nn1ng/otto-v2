<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Invoice;
use App\Models\Document;
use App\Models\Customer;
use App\Models\Supplier;
use App\Models\PendingDocument;
use App\Models\InvoiceLineItem;
use App\Models\DeliveryNoteItem;
use App\Models\PackingDetail;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;

class WebhookController extends Controller
{
    /**
     * Webhook endpoint for n8n to send extracted invoice data from Claude Vision
     *
     * Expected payload:
     * {
     *   "extracted_data": {
     *     "invoice_number": "INV-12345",
     *     "invoice_date": "2025-10-08",
     *     "supplier": { "name": "ABC Corp", "code": "SUP001" },
     *     "customer": { "name": "XYZ Ltd", "code": "CUST001" },
     *     "total_amount": 1500.00,
     *     "currency": "USD",
     *     "purchase_order": "PO-67890",
     *     "incoterms": "FOB",
     *     "requires_qc": true,
     *     "requires_bv": false,
     *     "requires_feri": true
     *   },
     *   "document": {
     *     "original_filename": "invoice.pdf",
     *     "file_path": "path/to/file",
     *     "file_size_bytes": 123456,
     *     "document_type": "invoice",
     *     "classification_confidence": 0.98
     *   }
     * }
     */
    public function receiveInvoiceData(Request $request): JsonResponse
    {
        try {
            Log::info('Received webhook from n8n', ['payload' => $request->all()]);

            $validated = $request->validate([
                'extracted_data' => 'required|array',
                'extracted_data.invoice_number' => 'required|string',
                'extracted_data.invoice_date' => 'required|date',
                'extracted_data.supplier' => 'required|array',
                'extracted_data.supplier.name' => 'required|string',
                'extracted_data.customer' => 'required|array',
                'extracted_data.customer.name' => 'required|string',
                'extracted_data.total_amount' => 'required|numeric',
                'extracted_data.currency' => 'required|string|max:3',
                'document' => 'nullable|array',
            ]);

            $extractedData = $validated['extracted_data'];

            // Check if invoice already exists
            $existingInvoice = Invoice::where('invoice_number', $extractedData['invoice_number'])->first();
            if ($existingInvoice) {
                Log::warning('Invoice already exists', ['invoice_number' => $extractedData['invoice_number']]);
                return response()->json([
                    'success' => true,
                    'message' => 'Invoice already exists',
                    'invoice_id' => $existingInvoice->id,
                    'invoice' => $existingInvoice->load(['customer', 'supplier', 'documents'])
                ], 200);
            }

            // Find or create supplier
            $supplier = Supplier::firstOrCreate(
                ['code' => $extractedData['supplier']['code'] ?? 'AUTO-' . time()],
                [
                    'name' => $extractedData['supplier']['name'],
                    'address' => $extractedData['supplier']['address'] ?? null,
                    'country' => $extractedData['supplier']['country'] ?? null,
                    'contact_person' => $extractedData['supplier']['contact_person'] ?? null,
                    'email' => $extractedData['supplier']['email'] ?? null,
                    'phone' => $extractedData['supplier']['phone'] ?? null,
                ]
            );

            // Find or create customer
            $customer = Customer::firstOrCreate(
                ['code' => $extractedData['customer']['code'] ?? 'AUTO-' . time()],
                [
                    'name' => $extractedData['customer']['name'],
                    'delivery_address' => $extractedData['customer']['delivery_address'] ?? null,
                    'country' => $extractedData['customer']['country'] ?? null,
                    'contact_person' => $extractedData['customer']['contact_person'] ?? null,
                    'email' => $extractedData['customer']['email'] ?? null,
                    'phone' => $extractedData['customer']['phone'] ?? null,
                ]
            );

            // Create invoice
            $invoice = Invoice::create([
                'invoice_number' => $extractedData['invoice_number'],
                'invoice_date' => $extractedData['invoice_date'],
                'supplier_id' => $supplier->id,
                'customer_id' => $customer->id,
                'total_amount' => $extractedData['total_amount'],
                'currency' => $extractedData['currency'],
                'purchase_order' => $extractedData['purchase_order'] ?? null,
                'incoterms' => $extractedData['incoterms'] ?? null,
                'extracted_data' => $extractedData,
                'current_owner' => 'key_accounts_manager',
                'current_stage' => 'invoice_received',
                'status' => 'draft',
                'requires_qc' => $extractedData['requires_qc'] ?? false,
                'requires_bv' => $extractedData['requires_bv'] ?? false,
                'requires_feri' => $extractedData['requires_feri'] ?? false,
                'can_proceed_to_transport' => false,
                'blocked_waiting_for_documents' => true,
            ]);

            // If document data is provided, create document record
            if (isset($validated['document'])) {
                $docData = $validated['document'];

                Document::create([
                    'invoice_id' => $invoice->id,
                    'document_type' => $docData['document_type'] ?? 'invoice',
                    'document_subtype' => $docData['document_subtype'] ?? null,
                    'original_filename' => $docData['original_filename'],
                    'file_path' => $docData['file_path'],
                    'file_size_bytes' => $docData['file_size_bytes'] ?? 0,
                    'extracted_data' => $extractedData,
                    'classification_confidence' => $docData['classification_confidence'] ?? null,
                    'uploaded_by' => null, // System upload from n8n
                ]);

                // Update workflow status
                $invoice->updateWorkflowStatus();
            }

            Log::info('Invoice created successfully from webhook', [
                'invoice_id' => $invoice->id,
                'invoice_number' => $invoice->invoice_number
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Invoice created successfully',
                'invoice_id' => $invoice->id,
                'invoice' => $invoice->load(['customer', 'supplier', 'documents'])
            ], 201);

        } catch (\Illuminate\Validation\ValidationException $e) {
            Log::error('Webhook validation error', ['errors' => $e->errors()]);
            return response()->json([
                'success' => false,
                'error' => 'Validation failed',
                'details' => $e->errors()
            ], 422);

        } catch (\Exception $e) {
            Log::error('Webhook processing error', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            return response()->json([
                'success' => false,
                'error' => 'Failed to process webhook',
                'message' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Upload invoice PDF - proxy to n8n workflow
     */
    public function uploadInvoicePdf(Request $request): JsonResponse
    {
        try {
            $validated = $request->validate([
                'pdf_base64' => 'required|string',
                'document_type' => 'required|string',
                'customer_code' => 'nullable|string',
            ]);

            // Forward to n8n workflow (V3 with MySQL direct save)
            $n8nUrl = 'http://localhost:5678/webhook/otto-invoice-upload-v3';

            $response = \Http::timeout(300)->post($n8nUrl, [
                'pdf_base64' => $validated['pdf_base64'],
                'document_type' => $validated['document_type'],
                'customer_code' => $validated['customer_code'] ?? 'DEFAULT',
            ]);

            if ($response->successful()) {
                return response()->json($response->json());
            } else {
                return response()->json([
                    'success' => false,
                    'error' => 'n8n workflow failed',
                    'message' => $response->body()
                ], $response->status());
            }
        } catch (\Exception $e) {
            Log::error('Upload PDF proxy error', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            return response()->json([
                'success' => false,
                'error' => 'Upload failed',
                'message' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Webhook endpoint for document uploads (when additional documents are processed)
     */
    public function receiveDocumentData(Request $request): JsonResponse
    {
        try {
            Log::info('Received document webhook from n8n', ['payload' => $request->all()]);

            $validated = $request->validate([
                'invoice_number' => 'required|string|exists:invoices,invoice_number',
                'document_type' => 'required|string',
                'document_subtype' => 'nullable|string',
                'original_filename' => 'required|string',
                'file_path' => 'required|string',
                'file_size_bytes' => 'nullable|integer',
                'extracted_data' => 'nullable|array',
                'classification_confidence' => 'nullable|numeric|min:0|max:1',
            ]);

            // Find invoice
            $invoice = Invoice::where('invoice_number', $validated['invoice_number'])->firstOrFail();

            // Create document
            $document = Document::create([
                'invoice_id' => $invoice->id,
                'document_type' => $validated['document_type'],
                'document_subtype' => $validated['document_subtype'] ?? null,
                'original_filename' => $validated['original_filename'],
                'file_path' => $validated['file_path'],
                'file_size_bytes' => $validated['file_size_bytes'] ?? 0,
                'extracted_data' => $validated['extracted_data'] ?? null,
                'classification_confidence' => $validated['classification_confidence'] ?? null,
                'uploaded_by' => null, // System upload from n8n
            ]);

            // If it's a certificate, mark it
            if (in_array($validated['document_type'], ['qc_certificate', 'bv_certificate', 'feri_certificate'])) {
                $certType = str_replace('_certificate', '', $validated['document_type']);
                $field = 'has_' . $certType . '_certificate';
                $invoice->update([$field => true]);
            }

            // Update workflow status
            $invoice->updateWorkflowStatus();

            Log::info('Document created successfully from webhook', [
                'document_id' => $document->id,
                'invoice_id' => $invoice->id
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Document created successfully',
                'document_id' => $document->id,
                'document' => $document,
                'invoice_status_updated' => $invoice->fresh()
            ], 201);

        } catch (\Exception $e) {
            Log::error('Document webhook processing error', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            return response()->json([
                'success' => false,
                'error' => 'Failed to process document webhook',
                'message' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get all pending documents
     */
    public function getPendingDocuments(Request $request): JsonResponse
    {
        $pending = PendingDocument::where('status', 'pending_review')
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json([
            'success' => true,
            'data' => $pending
        ]);
    }

    /**
     * Get single pending document
     */
    public function getPendingDocument($id): JsonResponse
    {
        $pending = PendingDocument::findOrFail($id);

        return response()->json([
            'success' => true,
            'data' => $pending
        ]);
    }

    /**
     * Reject pending document
     */
    public function rejectPendingDocument(Request $request, $id): JsonResponse
    {
        $pending = PendingDocument::findOrFail($id);

        $validated = $request->validate([
            'reason' => 'required|string',
        ]);

        $pending->update([
            'status' => 'rejected',
            'rejection_reason' => $validated['reason'],
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Document rejected',
        ]);
    }

    /**
     * NEW: Two-phase document processing
     * Phase 1: Store as pending with full JSON
     */
    public function receivePendingDocument(Request $request): JsonResponse
    {
        try {
            Log::info('Received pending document from n8n', ['payload_keys' => array_keys($request->all())]);

            $validated = $request->validate([
                'pdf_base64' => 'required|string',
                'claude_extraction' => 'required|array',
                'claude_extraction.summary' => 'required|array',
                'claude_extraction.documents' => 'required|array',
            ]);

            $summary = $validated['claude_extraction']['summary'];
            $documents = $validated['claude_extraction']['documents'];

            // Check if already exists
            $existing = PendingDocument::where('invoice_number', $summary['main_invoice_number'] ?? '')->first();
            if ($existing) {
                return response()->json([
                    'success' => true,
                    'message' => 'Pending document already exists',
                    'pending_document_id' => $existing->id,
                    'status' => $existing->status
                ], 200);
            }

            // Create pending document record
            $pending = PendingDocument::create([
                'invoice_number' => $summary['main_invoice_number'] ?? 'UNKNOWN',
                'supplier_name' => $summary['supplier'] ?? 'Unknown',
                'customer_name' => $summary['customer'] ?? 'Unknown',
                'total_amount' => $summary['total_amount'] ?? 0,
                'currency' => $summary['currency'] ?? 'USD',
                'invoice_date' => $summary['invoice_date'] ?? now(),
                'original_filename' => "invoice_{$summary['main_invoice_number']}_{time()}.pdf",
                'pdf_base64' => $validated['pdf_base64'],
                'file_size_bytes' => strlen($validated['pdf_base64']),
                'claude_extraction' => $validated['claude_extraction'],
                'classified_documents' => $documents,
                'status' => 'pending_review',
            ]);

            Log::info('Pending document created', ['id' => $pending->id]);

            return response()->json([
                'success' => true,
                'message' => 'Document stored for review',
                'pending_document_id' => $pending->id,
                'summary' => [
                    'invoice_number' => $pending->invoice_number,
                    'supplier' => $pending->supplier_name,
                    'customer' => $pending->customer_name,
                    'total_amount' => $pending->total_amount,
                    'currency' => $pending->currency,
                    'document_count' => count($documents),
                    'document_types' => array_column($documents, 'document_type'),
                ]
            ], 201);

        } catch (\Exception $e) {
            Log::error('Pending document processing error', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            return response()->json([
                'success' => false,
                'error' => 'Failed to process pending document',
                'message' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Phase 2: Acknowledge and populate full database
     */
    public function acknowledgePendingDocument(Request $request, $id): JsonResponse
    {
        try {
            Log::info('=== ACKNOWLEDGE FUNCTION CALLED ===', ['pending_id' => $id]);

            $pending = PendingDocument::findOrFail($id);

            if ($pending->status !== 'pending_review') {
                return response()->json([
                    'success' => false,
                    'error' => 'Document already processed'
                ], 400);
            }

            $extraction = $pending->claude_extraction;
            $documents = $pending->classified_documents;

            // Find main invoice document
            $invoiceDoc = collect($documents)->firstWhere('document_type', 'tax_invoice')
                       ?? collect($documents)->firstWhere('document_type', 'commercial_invoice');

            if (!$invoiceDoc) {
                return response()->json([
                    'success' => false,
                    'error' => 'No invoice document found in extraction'
                ], 400);
            }

            $invoiceData = $invoiceDoc['data'];

            Log::info('=== INVOICE DATA EXTRACTED ===', [
                'has_payment_terms' => isset($invoiceData['payment_terms']),
                'payment_terms_value' => $invoiceData['payment_terms'] ?? 'NULL',
                'has_supplier_address' => isset($invoiceData['supplier_address']),
                'has_delivery_method' => isset($invoiceData['delivery_method']),
            ]);

            // Also get delivery note for additional data (sometimes has email, etc)
            $deliveryNoteDoc = collect($documents)->firstWhere('document_type', 'delivery_note');
            $deliveryData = $deliveryNoteDoc['data'] ?? [];

            // Helper function to convert address object/array to string
            $convertAddressToString = function($address) {
                if (is_array($address)) {
                    return implode(', ', array_filter($address));
                }
                return $address;
            };

            // Check if invoice already exists
            $existingInvoice = Invoice::where('invoice_number', $pending->invoice_number)->first();
            if ($existingInvoice) {
                // Update pending document to mark as already processed
                $pending->update([
                    'status' => 'processed',
                    'acknowledged_at' => now(),
                    'acknowledged_by' => $request->user()?->name ?? 'system',
                    'invoice_id' => $existingInvoice->id,
                ]);

                return response()->json([
                    'success' => true,
                    'message' => 'Invoice already exists in system',
                    'invoice_id' => $existingInvoice->id,
                    'invoice' => $existingInvoice->load(['customer', 'supplier', 'documents'])
                ], 200);
            }

            // Create supplier
            $supplier = Supplier::firstOrCreate(
                ['code' => $invoiceData['supplier_code'] ?? 'AUTO-' . time()],
                [
                    'name' => $invoiceData['supplier_name'] ?? $pending->supplier_name,
                    'address' => $convertAddressToString($invoiceData['supplier_address'] ?? null),
                    'country' => $invoiceData['supplier_country'] ?? null,
                ]
            );

            // Create customer
            $customer = Customer::firstOrCreate(
                ['code' => $invoiceData['customer_code'] ?? 'AUTO-' . time()],
                [
                    'name' => $invoiceData['customer_name'] ?? $pending->customer_name,
                    'delivery_address' => $convertAddressToString($invoiceData['delivery_address'] ?? null),
                    'country' => $invoiceData['customer_country'] ?? null,
                ]
            );

            // Helper to extract incoterms from delivery method
            $extractIncoterms = function($deliveryMethod) {
                if (!$deliveryMethod) return null;
                $incotermsList = ['EXW', 'FCA', 'CPT', 'CIP', 'DAP', 'DPU', 'DDP', 'FAS', 'FOB', 'CFR', 'CIF'];
                $upperMethod = strtoupper($deliveryMethod);
                foreach ($incotermsList as $incoterm) {
                    if (strpos($upperMethod, $incoterm) !== false) {
                        return $incoterm;
                    }
                }
                return null;
            };

            // Extract incoterms from delivery_method if not explicitly provided
            $deliveryMethod = $invoiceData['delivery_method'] ?? null;
            $incoterms = $invoiceData['incoterms'] ?? $extractIncoterms($deliveryMethod);

            // Convert contact object to string
            $supplierContact = $invoiceData['supplier_contact'] ?? null;
            if (is_array($supplierContact)) {
                $supplierContact = implode(', ', array_filter($supplierContact));
            }

            // Extract email from supplier_contact if it's an object (check both invoice and delivery note)
            $supplierEmail = null;
            if (isset($invoiceData['supplier_contact']['email']) && $invoiceData['supplier_contact']['email']) {
                $supplierEmail = $invoiceData['supplier_contact']['email'];
            } elseif (isset($deliveryData['supplier_contact']['email']) && $deliveryData['supplier_contact']['email']) {
                $supplierEmail = $deliveryData['supplier_contact']['email'];
            } elseif (isset($invoiceData['supplier_email'])) {
                $supplierEmail = $invoiceData['supplier_email'];
            }

            // Extract exporter code from supplier registration (VAT number or reg number)
            $exporterCode = null;
            if (isset($invoiceData['supplier_registration']['vat_no'])) {
                $exporterCode = $invoiceData['supplier_registration']['vat_no'];
            } elseif (isset($invoiceData['supplier_registration']['reg_no'])) {
                $exporterCode = $invoiceData['supplier_registration']['reg_no'];
            } elseif (isset($invoiceData['exporter_code'])) {
                $exporterCode = $invoiceData['exporter_code'];
            }

            // Business rules for QC/BV requirements
            // QC: Required for KAMOA, ALPHAMIN, KIPUSHI customers
            $requiresQc = $customer->requires_qc ?? false;

            // BV: Required for all invoices over $2500
            $requiresBv = $pending->total_amount > 2500;

            // FERI: Required for all international shipments (default true)
            $requiresFeri = true;

            // Create invoice with ALL fields
            $invoiceCreateData = [
                'invoice_number' => $pending->invoice_number,
                'invoice_date' => $pending->invoice_date,
                'supplier_id' => $supplier->id,
                'customer_id' => $customer->id,
                'total_amount' => $pending->total_amount,
                'currency' => $pending->currency,
                'purchase_order' => $invoiceData['purchase_order'] ?? null,
                'incoterms' => $incoterms,
                'payment_terms' => $invoiceData['payment_terms'] ?? null,
                'delivery_method' => $deliveryMethod,
                'delivery_address' => $convertAddressToString($invoiceData['delivery_address'] ?? $invoiceData['customer_address'] ?? null),
                'supplier_address' => $convertAddressToString($invoiceData['supplier_address'] ?? null),
                'supplier_contact' => $supplierContact,
                'supplier_email' => $supplierEmail,
                'exporter_code' => $exporterCode,
                'hs_code' => $invoiceData['hs_code'] ?? null,
                'country_of_origin' => $invoiceData['country_of_origin'] ?? null,
                'extracted_data' => $invoiceData,
                'current_owner' => 'key_accounts_manager',
                'current_stage' => 'receiving',
                'status' => 'draft',
                'requires_qc' => $requiresQc,
                'requires_bv' => $requiresBv,
                'requires_feri' => $requiresFeri,
                'receiving_completed_at' => now(), // Mark receiving as complete when acknowledged
            ];

            Log::info('=== CREATING INVOICE WITH DATA ===', [
                'payment_terms' => $invoiceCreateData['payment_terms'],
                'delivery_method' => $invoiceCreateData['delivery_method'],
                'supplier_address' => $invoiceCreateData['supplier_address'],
                'supplier_email' => $invoiceCreateData['supplier_email'],
                'exporter_code' => $invoiceCreateData['exporter_code'],
                'customer_name' => $customer->name,
                'total_amount' => $pending->total_amount,
                'requires_qc' => $requiresQc ? 'YES' : 'NO',
                'requires_bv' => $requiresBv ? 'YES (> $2500)' : 'NO',
                'requires_feri' => $requiresFeri ? 'YES' : 'NO',
            ]);

            $invoice = Invoice::create($invoiceCreateData);

            // Process invoice line items
            if (isset($invoiceData['line_items']) && is_array($invoiceData['line_items'])) {
                foreach ($invoiceData['line_items'] as $index => $lineItem) {
                    InvoiceLineItem::create([
                        'invoice_id' => $invoice->id,
                        'line_number' => $lineItem['line_number'] ?? ($index + 1),
                        'item_code' => $lineItem['item_code'] ?? null,
                        'description' => $lineItem['description'] ?? '',
                        'quantity' => $lineItem['quantity'] ?? 0,
                        'unit_of_measure' => $lineItem['unit_of_measure'] ?? null,
                        'unit_price' => $lineItem['unit_price'] ?? 0,
                        'line_total' => $lineItem['line_total'] ?? 0,
                        'hs_code' => $lineItem['hs_code'] ?? null,
                        'country_of_origin' => $lineItem['country_of_origin'] ?? null,
                        'is_kit_item' => $lineItem['is_kit_item'] ?? false,
                        'extracted_data' => $lineItem,
                    ]);
                }
            }

            // Process delivery note items if exists
            $deliveryNoteDoc = collect($documents)->firstWhere('document_type', 'delivery_note');
            if ($deliveryNoteDoc && isset($deliveryNoteDoc['data']['items']) && is_array($deliveryNoteDoc['data']['items'])) {
                foreach ($deliveryNoteDoc['data']['items'] as $index => $dnItem) {
                    DeliveryNoteItem::create([
                        'invoice_id' => $invoice->id,
                        'invoice_line_item_id' => null, // Could be linked if we had matching logic
                        'line_number' => $dnItem['line_number'] ?? ($index + 1),
                        'item_code' => $dnItem['item_code'] ?? null,
                        'description' => $dnItem['description'] ?? '',
                        'quantity_shipped' => $dnItem['quantity_shipped'] ?? $dnItem['quantity'] ?? 0,
                        'unit_of_measure' => $dnItem['unit_of_measure'] ?? null,
                        'serial_number' => $dnItem['serial_number'] ?? null,
                        'batch_number' => $dnItem['batch_number'] ?? null,
                        'extracted_data' => $dnItem,
                    ]);
                }
            }

            // Process packing details if exists (can be multiple packing list documents)
            $packingListDocs = collect($documents)->where('document_type', 'packing_list');
            $packageNumber = 1;
            foreach ($packingListDocs as $packingListDoc) {
                $packingData = $packingListDoc['data'];

                // Extract dimensions
                $dimensions = $packingData['dimensions'] ?? [];
                $length = $dimensions['length_cm'] ?? null;
                $width = $dimensions['width_cm'] ?? null;
                $height = $dimensions['height_cm'] ?? null;

                // Calculate CBM if dimensions are available
                $cbm = null;
                if ($length && $width && $height) {
                    $cbm = ($length * $width * $height) / 1000000;
                }

                // Calculate volumetric weight (CBM * 167 for air freight)
                $volumetricWeight = $cbm ? $cbm * 167 : null;

                // Build contents description
                $contentsDescription = '';
                if (isset($packingData['contents']) && is_array($packingData['contents'])) {
                    $contentsDescription = collect($packingData['contents'])->map(function($c) {
                        $qty = $c['quantity'] ?? '';
                        $desc = $c['description'] ?? $c['line_item'] ?? '';
                        return $qty && $desc ? "$qty x $desc" : $desc;
                    })->filter()->join(', ');
                }

                PackingDetail::create([
                    'invoice_id' => $invoice->id,
                    'package_number' => $packageNumber++,
                    'package_type' => $packingData['pallet_number'] ?? "Package $packageNumber",
                    'length_cm' => $length,
                    'width_cm' => $width,
                    'height_cm' => $height,
                    'cbm' => $cbm,
                    'gross_weight_kg' => $packingData['weight_kg'] ?? null,
                    'net_weight_kg' => $packingData['weight_kg'] ?? null,
                    'volumetric_weight_kg' => $volumetricWeight,
                    'contents_description' => $contentsDescription,
                    'extracted_data' => $packingData,
                ]);
            }

            // Save the PDF from base64 to storage
            $pdfContent = base64_decode($pending->pdf_base64);
            $pdfFilename = "{$pending->invoice_number}_" . time() . ".pdf";
            $pdfPath = "documents/invoices/{$invoice->id}/{$pdfFilename}";
            Storage::disk('public')->put($pdfPath, $pdfContent);

            // Create document records for each classified document
            foreach ($documents as $doc) {
                Document::create([
                    'invoice_id' => $invoice->id,
                    'document_type' => $doc['document_type'],
                    'document_subtype' => null,
                    'original_filename' => $pending->original_filename,
                    'file_path' => $pdfPath,
                    'file_size_bytes' => $pending->file_size_bytes,
                    'extracted_data' => $doc['data'],
                    'classification_confidence' => $doc['confidence'] ?? 0.9,
                    'uploaded_by' => null,
                ]);
            }

            // Update pending document
            $pending->update([
                'status' => 'processed',
                'acknowledged_at' => now(),
                'acknowledged_by' => $request->user()?->name ?? 'system',
                'invoice_id' => $invoice->id,
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Invoice created successfully',
                'invoice_id' => $invoice->id,
                'invoice' => $invoice->load(['customer', 'supplier', 'documents'])
            ], 201);

        } catch (\Exception $e) {
            Log::error('Acknowledge pending document error', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            return response()->json([
                'success' => false,
                'error' => 'Failed to acknowledge document',
                'message' => $e->getMessage()
            ], 500);
        }
    }
}
