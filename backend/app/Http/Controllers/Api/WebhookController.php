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
use App\Models\LoadConfirmation;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\DB;

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

            // Auto-calculate expected_weight_kg from line items if not already set
            if (!$invoice->expected_weight_kg && $invoice->lineItems()->count() > 0) {
                $invoice->updateExpectedWeightFromLineItems();
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
     * Upload load confirmation PDF - proxy to n8n workflow for Gemini extraction
     * Then process the extracted data locally
     */
    public function uploadLoadConfirmationPdf(Request $request): JsonResponse
    {
        try {
            $validated = $request->validate([
                'pdf_base64' => 'required|string',
            ]);

            // Forward to n8n workflow for Gemini extraction (just extraction, no Laravel callback)
            // n8n will extract both invoice number and transport details from the PDF
            $n8nUrl = 'http://localhost:5678/webhook/otto-load-confirmation-extract';

            Log::info('Sending PDF to n8n for extraction');

            $response = \Http::timeout(300)->post($n8nUrl, [
                'pdf_base64' => $validated['pdf_base64'],
            ]);

            if (!$response->successful()) {
                return response()->json([
                    'success' => false,
                    'error' => 'n8n workflow failed',
                    'message' => $response->body()
                ], $response->status());
            }

            // Get extracted data from n8n
            $extractedResponse = $response->json();

            Log::info('Received extraction from n8n', ['response' => $extractedResponse]);

            // n8n returns data in different formats depending on the response node
            // It might be wrapped in an array or have the data directly
            $responseData = $extractedResponse;

            // If response is an array, get the first item
            if (is_array($extractedResponse) && isset($extractedResponse[0])) {
                $responseData = $extractedResponse[0];
            }

            // Check if we have the expected fields
            if (!isset($responseData['invoice_number']) || !isset($responseData['extracted_data'])) {
                Log::error('Invalid response structure from n8n', ['response' => $extractedResponse]);
                return response()->json([
                    'success' => false,
                    'error' => 'Invalid response from extraction service',
                    'details' => 'Missing invoice_number or extracted_data fields'
                ], 500);
            }

            // Process the extracted data locally (fast!)
            $invoiceNumber = $responseData['invoice_number'];
            $extractedData = $responseData['extracted_data'];

            // Find invoice by invoice number
            $invoice = Invoice::where('invoice_number', $invoiceNumber)->first();

            if (!$invoice) {
                return response()->json([
                    'success' => false,
                    'error' => 'Invoice not found',
                    'message' => "No invoice found with number: {$invoiceNumber}"
                ], 404);
            }

            // Update invoice with actual weight if provided
            if (!empty($extractedData['total_weight_kg'])) {
                $invoice->actual_weight_kg = $extractedData['total_weight_kg'];
                $invoice->save();
            }

            // Lookup vehicle details from vehicles table
            $vehicle = null;
            $vehicleType = null;
            $transporterFromVehicle = null;

            // Try to find vehicle from container_numbers array (more reliable than single vehicle_registration field)
            $containerNumbers = $extractedData['container_numbers'] ?? [];
            $vehicle = null;

            foreach ($containerNumbers as $registration) {
                $vehicle = \App\Models\Vehicle::findByRegistration($registration);
                if ($vehicle) {
                    $vehicleType = $vehicle->truck_type;
                    $transporterFromVehicle = $vehicle->transporter;

                    Log::info('Vehicle found in database from container numbers', [
                        'searched_registration' => $registration,
                        'vehicle_type' => $vehicleType,
                        'transporter' => $transporterFromVehicle
                    ]);
                    break; // Found a match, stop searching
                }
            }

            // Fallback: If not found in container_numbers, try vehicle_registration field
            if (!$vehicle && !empty($extractedData['vehicle_registration'])) {
                $vehicle = \App\Models\Vehicle::findByRegistration($extractedData['vehicle_registration']);

                if ($vehicle) {
                    $vehicleType = $vehicle->truck_type;
                    $transporterFromVehicle = $vehicle->transporter;

                    Log::info('Vehicle found in database from vehicle_registration field', [
                        'registration' => $extractedData['vehicle_registration'],
                        'vehicle_type' => $vehicleType,
                        'transporter' => $transporterFromVehicle
                    ]);
                }
            }

            // If still not found, calculate vehicle type
            if (!$vehicle) {
                Log::warning('Vehicle not found in database - will suggest based on registration count and weight', [
                    'container_numbers' => $containerNumbers,
                    'vehicle_registration' => $extractedData['vehicle_registration'] ?? null
                ]);
            }

            // Get currency from parent PO
            $currency = 'USD'; // Default
            if ($invoice->parent_invoice_id) {
                $parentPO = Invoice::find($invoice->parent_invoice_id);
                if ($parentPO) {
                    $currency = $parentPO->currency;
                }
            } else {
                // If no parent PO, use invoice currency
                $currency = $invoice->currency;
            }

            // Use transporter from vehicle database if available, otherwise use extracted data
            $transporterName = $transporterFromVehicle ?? $extractedData['transporter'] ?? null;

            // Try to find transporter ID from transporter name
            $transporterId = null;
            if ($transporterName) {
                $transporter = \App\Models\Transporter::findByName($transporterName);
                if ($transporter) {
                    $transporterId = $transporter->id;
                    Log::info('Transporter found in database', [
                        'name' => $transporterName,
                        'transporter_id' => $transporterId
                    ]);
                } else {
                    Log::warning('Transporter not found in database', [
                        'name' => $transporterName
                    ]);
                }
            }

            // Parse container numbers to get truck and trailer registrations
            // Container numbers can have duplicates (horse appears twice)
            // Note: $containerNumbers already defined above for vehicle lookup
            $uniqueRegistrations = array_values(array_unique($containerNumbers));

            $truckReg = $uniqueRegistrations[0] ?? $extractedData['vehicle_registration'] ?? null;
            $trailer1Reg = $uniqueRegistrations[1] ?? null;
            $trailer2Reg = $uniqueRegistrations[2] ?? null;

            // Suggest vehicle type based on registration count and invoice weight
            $registrationCount = count($uniqueRegistrations);
            $expectedWeight = $invoice->expected_weight_kg ?? 0;
            $suggestedVehicleType = $this->suggestVehicleType($registrationCount, $expectedWeight);

            // Use suggested vehicle type ONLY if we don't have one from database
            if (!$vehicleType && $registrationCount > 0) {
                $vehicleType = $suggestedVehicleType;
            }

            // Get addresses from supplier and customer
            $supplier = $invoice->supplier;
            $customer = $invoice->customer;

            $collectionAddress = $supplier ? $supplier->address : null;
            // Get delivery address from invoice, not customer (invoices have specific delivery locations)
            $deliveryAddress = $invoice->delivery_address ?? null;

            // Get default contact from invoice's department (if exists)
            $contactForNucleus = null;
            if ($invoice->department_id) {
                $department = \App\Models\Department::find($invoice->department_id);
                if ($department && $department->loadconfirmation_contacts) {
                    $contactForNucleus = $department->loadconfirmation_contacts;
                }
            }

            // Get agents from invoice
            $clearingAgent = $invoice->exit_agent;
            $entryAgent = $invoice->entry_agent;

            // Calculate special instructions based on vehicle type
            $specialInstructions = $this->calculateSpecialInstructions($vehicleType);

            // Create temporary file reference based on invoice number
            $tempFileReference = 'LC-' . $invoice->invoice_number . '-' . now()->timestamp;

            // Check if load confirmation already exists for this invoice via pivot table
            $existingLC = $invoice->loadConfirmations()->first();

            if (!$existingLC) {
                // Create new load confirmation
                $loadConfirmation = LoadConfirmation::create([
                    'file_reference' => $tempFileReference,
                    'confirmation_date' => $this->parseLoadConfirmationDate($extractedData['date_loaded'] ?? null), // Date loaded from handwriting
                    'collection_date' => $this->parseLoadConfirmationDate($extractedData['date_loaded'] ?? null), // Same as confirmation date for now
                    'transporter_id' => $transporterId,
                    'transporter_name' => $transporterName,
                    'attention' => $extractedData['driver_name'] ?? null, // Driver name goes in attention field
                    'contact_details' => $extractedData['driver_contact'] ?? null, // Driver contact goes here
                    'currency' => $currency, // From parent PO
                    'vehicle_type' => $vehicleType, // From vehicles table or calculated
                    'truck_registration' => $truckReg,
                    'trailer_1_registration' => $trailer1Reg,
                    'trailer_2_registration' => $trailer2Reg,
                    'clearing_agent' => $clearingAgent,
                    'entry_agent' => $entryAgent,
                    'collection_address' => $collectionAddress,
                    'collection_address_2' => null, // Manual entry by user
                    'delivery_address' => $deliveryAddress,
                    'commodity_description' => 'Mining Equipment', // Default, user will edit
                    'contact_for_nucleus_drc' => $contactForNucleus, // From invoice's department
                    'straps' => $specialInstructions['straps'],
                    'chains' => $specialInstructions['chains'],
                    'tarpaulin' => $specialInstructions['tarpaulin'],
                    'corner_plates' => $specialInstructions['corner_plates'],
                    'uprights' => $specialInstructions['uprights'],
                    'rubber_protection' => $specialInstructions['rubber_protection'],
                    'status' => 'transport_confirmed', // Already loaded
                ]);

                // Link load confirmation to invoice via pivot table
                $invoice->loadConfirmations()->attach($loadConfirmation->id, [
                    'added_at' => now()
                ]);

                Log::info('Load confirmation created and linked to invoice', [
                    'load_confirmation_id' => $loadConfirmation->id,
                    'invoice_id' => $invoice->id,
                    'file_reference' => $tempFileReference,
                    'truck' => $truckReg,
                    'trailer1' => $trailer1Reg,
                    'trailer2' => $trailer2Reg
                ]);
            } else {
                // Update existing load confirmation with actual loading data
                $loadConfirmation = $existingLC;
                $loadConfirmation->update([
                    'confirmation_date' => $this->parseLoadConfirmationDate($extractedData['date_loaded'] ?? null) ?? $loadConfirmation->confirmation_date,
                    'collection_date' => $this->parseLoadConfirmationDate($extractedData['date_loaded'] ?? null) ?? $loadConfirmation->collection_date,
                    'transporter_id' => $transporterId ?? $loadConfirmation->transporter_id,
                    'transporter_name' => $transporterName ?? $loadConfirmation->transporter_name,
                    'attention' => $extractedData['driver_name'] ?? $loadConfirmation->attention,
                    'contact_details' => $extractedData['driver_contact'] ?? $loadConfirmation->contact_details,
                    'vehicle_type' => $vehicleType ?? $loadConfirmation->vehicle_type,
                    'truck_registration' => $truckReg ?? $loadConfirmation->truck_registration,
                    'trailer_1_registration' => $trailer1Reg ?? $loadConfirmation->trailer_1_registration,
                    'trailer_2_registration' => $trailer2Reg ?? $loadConfirmation->trailer_2_registration,
                    'clearing_agent' => $clearingAgent ?? $loadConfirmation->clearing_agent,
                    'entry_agent' => $entryAgent ?? $loadConfirmation->entry_agent,
                    'collection_address' => $collectionAddress ?? $loadConfirmation->collection_address,
                    'delivery_address' => $deliveryAddress ?? $loadConfirmation->delivery_address,
                    'currency' => $currency,
                    'status' => 'transport_confirmed',
                ]);

                Log::info('Load confirmation updated from extraction', [
                    'load_confirmation_id' => $loadConfirmation->id,
                    'invoice_id' => $invoice->id
                ]);
            }

            // Update invoice status to reflect that transport has been arranged and vehicle loaded
            $invoice->update([
                'status' => 'in_transit',
                'current_stage' => 'in_transit',
            ]);

            Log::info('Invoice status updated after load confirmation', [
                'invoice_id' => $invoice->id,
                'invoice_number' => $invoice->invoice_number,
                'new_status' => 'in_transit'
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Load confirmation processed successfully',
                'data' => [
                    'load_confirmation_id' => $loadConfirmation->id,
                    'invoice_id' => $invoice->id,
                    'invoice_number' => $invoiceNumber
                ]
            ]);

        } catch (\Exception $e) {
            Log::error('Upload load confirmation PDF error', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            return response()->json([
                'success' => false,
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Webhook endpoint for n8n to send extracted load confirmation data from Gemini
     *
     * Expected payload from n8n:
     * {
     *   "invoice_number": "IN018197",
     *   "extracted_data": {
     *     "total_weight_kg": 32000,
     *     "container_numbers": ["JN42XZGP", "JC 96 JMGP", "JC 46JN GP"],
     *     "driver_name": "Tawoma",
     *     "driver_contact": "+263 77 5 600097",
     *     "date_loaded": "2025-10-23",
     *     "time_loaded": "08:00",
     *     "transporter": "Nucleus",
     *     "vehicle_registration": "JN42X2SGP",
     *     "loaded_by": "Elriko"
     *   }
     * }
     */
    public function receiveLoadConfirmationExtraction(Request $request): JsonResponse
    {
        try {
            Log::info('Received load confirmation extraction from n8n', ['payload' => $request->all()]);

            $validated = $request->validate([
                'invoice_number' => 'required|string',
                'extracted_data' => 'required|array',
                'extracted_data.total_weight_kg' => 'nullable|numeric',
                'extracted_data.container_numbers' => 'nullable|array',
                'extracted_data.driver_name' => 'nullable|string',
                'extracted_data.driver_contact' => 'nullable|string',
                'extracted_data.date_loaded' => 'nullable|date',
                'extracted_data.time_loaded' => 'nullable|string',
                'extracted_data.transporter' => 'nullable|string',
                'extracted_data.vehicle_registration' => 'nullable|string',
                'extracted_data.loaded_by' => 'nullable|string',
                'document' => 'nullable|array', // PDF document data from n8n
                'document.original_filename' => 'required_with:document|string',
                'document.file_path' => 'required_with:document|string',
                'document.file_size_bytes' => 'nullable|integer',
            ]);

            // Find invoice by invoice number
            $invoice = Invoice::where('invoice_number', $validated['invoice_number'])->first();

            if (!$invoice) {
                return response()->json([
                    'success' => false,
                    'error' => 'Invoice not found',
                    'message' => "No invoice found with number: {$validated['invoice_number']}"
                ], 404);
            }

            $extractedData = $validated['extracted_data'];

            // Update invoice with actual weight if provided
            if (!empty($extractedData['total_weight_kg'])) {
                $invoice->actual_weight_kg = $extractedData['total_weight_kg'];
                $invoice->save();
            }

            // Lookup vehicle details from vehicles table
            $vehicle = null;
            $vehicleType = null;
            $transporterFromVehicle = null;

            // Try to find vehicle from container_numbers array (more reliable than single vehicle_registration field)
            $containerNumbers = $extractedData['container_numbers'] ?? [];
            $vehicle = null;

            foreach ($containerNumbers as $registration) {
                $vehicle = \App\Models\Vehicle::findByRegistration($registration);
                if ($vehicle) {
                    $vehicleType = $vehicle->truck_type;
                    $transporterFromVehicle = $vehicle->transporter;

                    Log::info('Vehicle found in database from container numbers', [
                        'searched_registration' => $registration,
                        'vehicle_type' => $vehicleType,
                        'transporter' => $transporterFromVehicle
                    ]);
                    break; // Found a match, stop searching
                }
            }

            // Fallback: If not found in container_numbers, try vehicle_registration field
            if (!$vehicle && !empty($extractedData['vehicle_registration'])) {
                $vehicle = \App\Models\Vehicle::findByRegistration($extractedData['vehicle_registration']);

                if ($vehicle) {
                    $vehicleType = $vehicle->truck_type;
                    $transporterFromVehicle = $vehicle->transporter;

                    Log::info('Vehicle found in database from vehicle_registration field', [
                        'registration' => $extractedData['vehicle_registration'],
                        'vehicle_type' => $vehicleType,
                        'transporter' => $transporterFromVehicle
                    ]);
                }
            }

            // If still not found, calculate vehicle type
            if (!$vehicle) {
                Log::warning('Vehicle not found in database - will suggest based on registration count and weight', [
                    'container_numbers' => $containerNumbers,
                    'vehicle_registration' => $extractedData['vehicle_registration'] ?? null
                ]);
            }

            // Get currency from parent PO
            $currency = 'USD'; // Default
            if ($invoice->parent_invoice_id) {
                $parentPO = Invoice::find($invoice->parent_invoice_id);
                if ($parentPO) {
                    $currency = $parentPO->currency;
                }
            } else {
                // If no parent PO, use invoice currency
                $currency = $invoice->currency;
            }

            // Use transporter from vehicle database if available, otherwise use extracted data
            $transporterName = $transporterFromVehicle ?? $extractedData['transporter'] ?? null;

            // Try to find transporter ID from transporter name
            $transporterId = null;
            if ($transporterName) {
                $transporter = \App\Models\Transporter::findByName($transporterName);
                if ($transporter) {
                    $transporterId = $transporter->id;
                    Log::info('Transporter found in database', [
                        'name' => $transporterName,
                        'transporter_id' => $transporterId
                    ]);
                } else {
                    Log::warning('Transporter not found in database', [
                        'name' => $transporterName
                    ]);
                }
            }

            // Parse container numbers to get truck and trailer registrations
            // Container numbers can have duplicates (horse appears twice)
            // Note: $containerNumbers already defined above for vehicle lookup
            $uniqueRegistrations = array_values(array_unique($containerNumbers));

            $truckReg = $uniqueRegistrations[0] ?? $extractedData['vehicle_registration'] ?? null;
            $trailer1Reg = $uniqueRegistrations[1] ?? null;
            $trailer2Reg = $uniqueRegistrations[2] ?? null;

            // Suggest vehicle type based on registration count and invoice weight
            $registrationCount = count($uniqueRegistrations);
            $expectedWeight = $invoice->expected_weight_kg ?? 0;
            $suggestedVehicleType = $this->suggestVehicleType($registrationCount, $expectedWeight);

            // Use suggested vehicle type ONLY if we don't have one from database
            if (!$vehicleType && $registrationCount > 0) {
                $vehicleType = $suggestedVehicleType;
            }

            // Get addresses from supplier and customer
            $supplier = $invoice->supplier;
            $customer = $invoice->customer;

            $collectionAddress = $supplier ? $supplier->address : null;
            // Get delivery address from invoice, not customer (invoices have specific delivery locations)
            $deliveryAddress = $invoice->delivery_address ?? null;

            // Get default contact from invoice's department (if exists)
            $contactForNucleus = null;
            if ($invoice->department_id) {
                $department = \App\Models\Department::find($invoice->department_id);
                if ($department && $department->loadconfirmation_contacts) {
                    $contactForNucleus = $department->loadconfirmation_contacts;
                }
            }

            // Get agents from invoice
            $clearingAgent = $invoice->exit_agent;
            $entryAgent = $invoice->entry_agent;

            // Calculate special instructions based on vehicle type
            $specialInstructions = $this->calculateSpecialInstructions($vehicleType);

            // Create temporary file reference based on invoice number
            $tempFileReference = 'LC-' . $invoice->invoice_number . '-' . now()->timestamp;

            // Check if load confirmation already exists for this invoice via pivot table
            $existingLC = $invoice->loadConfirmations()->first();

            if (!$existingLC) {
                // Create new load confirmation
                $loadConfirmation = LoadConfirmation::create([
                    'file_reference' => $tempFileReference,
                    'confirmation_date' => $this->parseLoadConfirmationDate($extractedData['date_loaded'] ?? null), // Date loaded from handwriting
                    'collection_date' => $this->parseLoadConfirmationDate($extractedData['date_loaded'] ?? null), // Same as confirmation date for now
                    'transporter_id' => $transporterId,
                    'transporter_name' => $transporterName,
                    'attention' => $extractedData['driver_name'] ?? null, // Driver name goes in attention field
                    'contact_details' => $extractedData['driver_contact'] ?? null, // Driver contact goes here
                    'currency' => $currency, // From parent PO
                    'vehicle_type' => $vehicleType, // From vehicles table or calculated
                    'truck_registration' => $truckReg,
                    'trailer_1_registration' => $trailer1Reg,
                    'trailer_2_registration' => $trailer2Reg,
                    'clearing_agent' => $clearingAgent,
                    'entry_agent' => $entryAgent,
                    'collection_address' => $collectionAddress,
                    'collection_address_2' => null, // Manual entry by user
                    'delivery_address' => $deliveryAddress,
                    'commodity_description' => 'Mining Equipment', // Default, user will edit
                    'contact_for_nucleus_drc' => $contactForNucleus, // From invoice's department
                    'straps' => $specialInstructions['straps'],
                    'chains' => $specialInstructions['chains'],
                    'tarpaulin' => $specialInstructions['tarpaulin'],
                    'corner_plates' => $specialInstructions['corner_plates'],
                    'uprights' => $specialInstructions['uprights'],
                    'rubber_protection' => $specialInstructions['rubber_protection'],
                    'status' => 'transport_confirmed', // Already loaded
                ]);

                // Link load confirmation to invoice via pivot table
                $invoice->loadConfirmations()->attach($loadConfirmation->id, [
                    'added_at' => now()
                ]);

                Log::info('Load confirmation created and linked to invoice', [
                    'load_confirmation_id' => $loadConfirmation->id,
                    'invoice_id' => $invoice->id,
                    'file_reference' => $tempFileReference,
                    'truck' => $truckReg,
                    'trailer1' => $trailer1Reg,
                    'trailer2' => $trailer2Reg
                ]);
            } else {
                // Update existing load confirmation with actual loading data
                $loadConfirmation = $existingLC;
                $loadConfirmation->update([
                    'confirmation_date' => $this->parseLoadConfirmationDate($extractedData['date_loaded'] ?? null) ?? $loadConfirmation->confirmation_date,
                    'collection_date' => $this->parseLoadConfirmationDate($extractedData['date_loaded'] ?? null) ?? $loadConfirmation->collection_date,
                    'transporter_id' => $transporterId ?? $loadConfirmation->transporter_id,
                    'transporter_name' => $transporterName ?? $loadConfirmation->transporter_name,
                    'attention' => $extractedData['driver_name'] ?? $loadConfirmation->attention,
                    'contact_details' => $extractedData['driver_contact'] ?? $loadConfirmation->contact_details,
                    'vehicle_type' => $vehicleType ?? $loadConfirmation->vehicle_type,
                    'truck_registration' => $truckReg ?? $loadConfirmation->truck_registration,
                    'trailer_1_registration' => $trailer1Reg ?? $loadConfirmation->trailer_1_registration,
                    'trailer_2_registration' => $trailer2Reg ?? $loadConfirmation->trailer_2_registration,
                    'clearing_agent' => $clearingAgent ?? $loadConfirmation->clearing_agent,
                    'entry_agent' => $entryAgent ?? $loadConfirmation->entry_agent,
                    'collection_address' => $collectionAddress ?? $loadConfirmation->collection_address,
                    'delivery_address' => $deliveryAddress ?? $loadConfirmation->delivery_address,
                    'currency' => $currency,
                    'status' => 'transport_confirmed',
                ]);

                Log::info('Load confirmation updated from extraction', [
                    'load_confirmation_id' => $loadConfirmation->id,
                    'invoice_id' => $invoice->id
                ]);
            }

            // Save load confirmation PDF document if provided by n8n
            if (isset($validated['document'])) {
                $docData = $validated['document'];

                // Check if document already exists for this load confirmation
                $existingDoc = Document::where('invoice_id', $invoice->id)
                    ->where('original_filename', $docData['original_filename'])
                    ->first();

                if (!$existingDoc) {
                    Document::create([
                        'invoice_id' => $invoice->id,
                        'document_type' => 'other', // Load confirmations are categorized as 'other'
                        'document_subtype' => 'load_confirmation',
                        'original_filename' => $docData['original_filename'],
                        'file_path' => $docData['file_path'],
                        'file_size_bytes' => $docData['file_size_bytes'] ?? 0,
                        'extracted_data' => $extractedData,
                        'classification_confidence' => null,
                        'uploaded_by' => null, // System upload from n8n
                    ]);

                    Log::info('Load confirmation PDF saved to documents table', [
                        'invoice_id' => $invoice->id,
                        'load_confirmation_id' => $loadConfirmation->id,
                        'filename' => $docData['original_filename'],
                        'file_path' => $docData['file_path']
                    ]);
                } else {
                    Log::info('Load confirmation PDF already exists', [
                        'document_id' => $existingDoc->id,
                        'filename' => $docData['original_filename']
                    ]);
                }

                // Mark PDF as generated so "Generate Manifest" action becomes available
                $loadConfirmation->pdf_generated = true;
                $loadConfirmation->save();

                Log::info('Load confirmation marked as pdf_generated = true', [
                    'load_confirmation_id' => $loadConfirmation->id
                ]);
            }

            // Update invoice status to reflect that transport has been arranged and vehicle loaded
            $invoice->update([
                'status' => 'in_transit',
                'current_stage' => 'in_transit',
            ]);

            Log::info('Invoice status updated after load confirmation', [
                'invoice_id' => $invoice->id,
                'invoice_number' => $invoice->invoice_number,
                'new_status' => 'in_transit'
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Load confirmation processed successfully',
                'data' => [
                    'load_confirmation_id' => $loadConfirmation->id,
                    'invoice_id' => $invoice->id,
                ]
            ]);

        } catch (\Exception $e) {
            Log::error('Load confirmation extraction webhook error', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            return response()->json([
                'success' => false,
                'error' => 'Failed to process load confirmation extraction',
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

            // Auto-calculate expected_weight_kg from line items if not already set
            $invoice->refresh(); // Reload to get line items
            if (!$invoice->expected_weight_kg && $invoice->lineItems()->count() > 0) {
                $invoice->updateExpectedWeightFromLineItems();
            }

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

    /**
     * Calculate vehicle type based on weight and package count
     * Business rules:
     * - < 1000 kg: 1 TON
     * - 1000-2000 kg: 2 TON
     * - 2000-4000 kg: 4 TON
     * - 4000-8000 kg: 8 TON
     * - 8000-10000 kg: 10 TON
     * - 10000-12000 kg: 12 TON
     * - 12000-15000 kg: 15 TON
     * - > 15000 kg: Check package count
     *   - > 30 packages: SUPERLINK
     *   - <= 30 packages: TRI-AXLE
     */
    private function calculateVehicleType(Invoice $invoice, ?float $weight): ?string
    {
        // Use provided weight or invoice weight
        $totalWeight = $weight ?? $invoice->actual_weight_kg ?? $invoice->expected_weight_kg;

        if (!$totalWeight) {
            Log::warning('Cannot calculate vehicle type: no weight data');
            return null;
        }

        // Weight-based calculation for smaller trucks
        if ($totalWeight < 1000) {
            return '1 TON';
        } elseif ($totalWeight < 2000) {
            return '2 TON';
        } elseif ($totalWeight < 4000) {
            return '4 TON';
        } elseif ($totalWeight < 8000) {
            return '8 TON';
        } elseif ($totalWeight < 10000) {
            return '10 TON';
        } elseif ($totalWeight < 12000) {
            return '12 TON';
        } elseif ($totalWeight < 15000) {
            return '15 TON';
        }

        // For heavy loads (> 15000 kg), use package count to distinguish
        // between SUPERLINK and TRI-AXLE
        $packageCount = DB::table('packing_details')
            ->where('invoice_id', $invoice->id)
            ->sum('quantity');

        Log::info('Calculating vehicle type for heavy load', [
            'weight' => $totalWeight,
            'package_count' => $packageCount
        ]);

        if ($packageCount > 30) {
            return 'SUPERLINK';
        } else {
            return 'TRI-AXLE';
        }
    }

    /**
     * Suggest vehicle type based on registration count and invoice weight
     *
     * @param int $registrationCount Number of unique vehicle registrations
     * @param float $weightKg Invoice expected weight in kilograms
     * @return string|null Suggested vehicle type
     */
    private function suggestVehicleType(int $registrationCount, float $weightKg): ?string
    {
        // Priority 1: Base suggestion on registration count
        if ($registrationCount === 3) {
            // 3 registrations = truck + 2 trailers = SUPERLINK
            return 'SUPERLINK';
        } elseif ($registrationCount === 2) {
            // 2 registrations = truck + 1 trailer = TRI-AXLE
            return 'TRI-AXLE';
        }

        // Priority 2: Base suggestion on weight if we have 1 registration
        if ($registrationCount === 1) {
            // Heavy loads
            if ($weightKg >= 30000) {
                return 'SUPERLINK';
            } elseif ($weightKg >= 15000) {
                return 'TRI-AXLE';
            } elseif ($weightKg >= 12000) {
                return '15 TON';
            } elseif ($weightKg >= 10000) {
                return '12 TON';
            } elseif ($weightKg >= 8000) {
                return '10 TON';
            } else {
                return '8 TON';
            }
        }

        // No registrations found - return null to let user select manually
        return null;
    }

    /**
     * Calculate special instructions based on vehicle type
     * These are load securing requirements
     */
    private function calculateSpecialInstructions(?string $vehicleType): array
    {
        // Default: all false
        $instructions = [
            'straps' => false,
            'chains' => false,
            'tarpaulin' => false,
            'corner_plates' => false,
            'uprights' => false,
            'rubber_protection' => false,
        ];

        if (!$vehicleType) {
            return $instructions;
        }

        // Heavy vehicles (SUPERLINK, TRI-AXLE) require more securing
        if (in_array($vehicleType, ['SUPERLINK', 'TRI-AXLE'])) {
            $instructions['straps'] = true;
            $instructions['chains'] = true;
            $instructions['tarpaulin'] = true;
            $instructions['corner_plates'] = true;
            $instructions['uprights'] = true;
            $instructions['rubber_protection'] = true;
        }
        // Medium to large trucks (>= 8 TON)
        elseif (in_array($vehicleType, ['8 TON', '10 TON', '12 TON', '15 TON'])) {
            $instructions['straps'] = true;
            $instructions['chains'] = true;
            $instructions['tarpaulin'] = true;
            $instructions['corner_plates'] = true;
        }
        // Smaller trucks
        else {
            $instructions['straps'] = true;
            $instructions['tarpaulin'] = true;
        }

        return $instructions;
    }

    /**
     * Parse date from various formats commonly found in handwritten load confirmations
     * Handles: DD/MM, DD/MM/YYYY, YYYY-MM-DD
     *
     * @param string|null $dateString
     * @return string|null Returns YYYY-MM-DD format or null
     */
    private function parseLoadConfirmationDate(?string $dateString): ?string
    {
        if (empty($dateString)) {
            return null;
        }

        // Clean up the date string
        $dateString = trim($dateString);

        try {
            // If already in YYYY-MM-DD format, return as is
            if (preg_match('/^\d{4}-\d{2}-\d{2}$/', $dateString)) {
                return $dateString;
            }

            // Handle DD/MM format (assume current year)
            if (preg_match('/^(\d{1,2})\/(\d{1,2})$/', $dateString, $matches)) {
                $day = str_pad($matches[1], 2, '0', STR_PAD_LEFT);
                $month = str_pad($matches[2], 2, '0', STR_PAD_LEFT);
                $year = date('Y');

                // Validate the date
                if (checkdate((int)$month, (int)$day, (int)$year)) {
                    return "$year-$month-$day";
                }
            }

            // Handle DD/MM/YYYY or DD/MM/YY format
            if (preg_match('/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/', $dateString, $matches)) {
                $day = str_pad($matches[1], 2, '0', STR_PAD_LEFT);
                $month = str_pad($matches[2], 2, '0', STR_PAD_LEFT);
                $year = $matches[3];

                // Convert 2-digit year to 4-digit
                if (strlen($year) == 2) {
                    $year = (int)$year < 50 ? '20' . $year : '19' . $year;
                }

                // Validate the date
                if (checkdate((int)$month, (int)$day, (int)$year)) {
                    return "$year-$month-$day";
                }
            }

            // Try Carbon as fallback
            $carbonDate = \Carbon\Carbon::parse($dateString);
            return $carbonDate->format('Y-m-d');

        } catch (\Exception $e) {
            \Log::warning("Failed to parse date '$dateString': " . $e->getMessage());
            return null;
        }
    }
}
