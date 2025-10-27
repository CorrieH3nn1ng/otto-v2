<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\InvoiceController;
use App\Http\Controllers\Api\DocumentController;
use App\Http\Controllers\Api\LoadConfirmationController;
use App\Http\Controllers\Api\ManifestController;
use App\Http\Controllers\Api\TransportRequestController;
use App\Http\Controllers\Api\WebhookController;
use App\Http\Controllers\Api\LicenseController;

// Purchase Order routes
Route::prefix('purchase-orders')->group(function () {
    Route::get('/', [InvoiceController::class, 'getPurchaseOrders']);
    Route::post('/', [InvoiceController::class, 'createPurchaseOrder']);
    Route::post('/upload', [InvoiceController::class, 'uploadPurchaseOrder']);
    Route::get('/{id}', [InvoiceController::class, 'getPurchaseOrder']);
    Route::get('/{id}/licenses', [LicenseController::class, 'getByPurchaseOrder']);
});

// License routes
Route::prefix('licenses')->group(function () {
    Route::post('/upload', [LicenseController::class, 'upload']);
    Route::get('/{id}', [LicenseController::class, 'show']);
    Route::delete('/{id}', [LicenseController::class, 'destroy']);
});

// Invoice routes
Route::prefix('invoices')->group(function () {
    Route::get('/', [InvoiceController::class, 'index']);
    Route::post('/', [InvoiceController::class, 'store']);
    // Specific routes MUST come before /{id} routes
    Route::get('/statistics', [InvoiceController::class, 'statistics']);
    Route::get('/unique-file-names', [InvoiceController::class, 'getUniqueFileNames']);
    Route::post('/validate-file-name', [InvoiceController::class, 'validateFileName']);
    // Parameterized routes come after
    Route::get('/{id}', [InvoiceController::class, 'show']);
    Route::put('/{id}', [InvoiceController::class, 'update']);
    Route::delete('/{id}', [InvoiceController::class, 'destroy']);
    Route::post('/{id}/request-transport', [InvoiceController::class, 'requestTransport']);
    Route::post('/{id}/check-documents', [InvoiceController::class, 'checkDocuments']);
    Route::post('/{id}/documents', [DocumentController::class, 'uploadToInvoice']);
    Route::get('/{id}/workflow-stages', [InvoiceController::class, 'getWorkflowStages']);
    Route::post('/{id}/progress-workflow', [InvoiceController::class, 'progressWorkflow']);
    Route::post('/{id}/update-qc-status', [InvoiceController::class, 'updateQcStatus']);
    Route::post('/{id}/update-bv-status', [InvoiceController::class, 'updateBvStatus']);
    Route::post('/{id}/mark-ready-for-transport', [InvoiceController::class, 'markReadyForTransport']);
    Route::get('/{id}/activities', [InvoiceController::class, 'getActivities']);
    // Manual Packing List routes (for when supplier doesn't provide packing list)
    Route::post('/{id}/packing-list', [InvoiceController::class, 'storePackingList']);
    Route::get('/{id}/packing-list', [InvoiceController::class, 'getPackingList']);
    Route::get('/{id}/packing-list/pdf', [InvoiceController::class, 'generatePackingListPDF']);
    // Auto-generation packing list routes
    Route::get('/{id}/check-packaging-rules', [InvoiceController::class, 'checkPackagingRules']);
    Route::post('/{id}/generate-packing-list', [InvoiceController::class, 'generatePackingList']);
});

// Document routes
Route::prefix('documents')->group(function () {
    Route::get('/invoice/{invoiceId}', [DocumentController::class, 'index']);
    Route::post('/', [DocumentController::class, 'store']);
    Route::get('/{id}', [DocumentController::class, 'show']);
    Route::get('/{id}/view', [DocumentController::class, 'view']);
    Route::put('/{id}', [DocumentController::class, 'update']);
    Route::delete('/{id}', [DocumentController::class, 'destroy']);
    Route::get('/{id}/download', [DocumentController::class, 'download']);
    Route::post('/{id}/mark-certificate', [DocumentController::class, 'markCertificate']);
});

// Load Confirmation routes
Route::prefix('load-confirmations')->group(function () {
    Route::get('/', [LoadConfirmationController::class, 'index']);
    Route::post('/', [LoadConfirmationController::class, 'store']);
    Route::get('/{id}', [LoadConfirmationController::class, 'show']);
    Route::put('/{id}', [LoadConfirmationController::class, 'update']);
    Route::delete('/{id}', [LoadConfirmationController::class, 'destroy']);
    Route::post('/{id}/attach-invoices', [LoadConfirmationController::class, 'attachInvoices']);
    Route::post('/{id}/detach-invoices', [LoadConfirmationController::class, 'detachInvoices']);
    Route::post('/{id}/request-transport', [LoadConfirmationController::class, 'requestTransport']);
    Route::post('/{id}/assign', [LoadConfirmationController::class, 'assign']);
    Route::post('/{id}/email', [LoadConfirmationController::class, 'emailLoadConfirmation']);
});

// Transport Request routes
Route::prefix('transport-requests')->group(function () {
    Route::get('/', [TransportRequestController::class, 'index']);
    Route::post('/', [TransportRequestController::class, 'store']);
    Route::get('/{id}', [TransportRequestController::class, 'show']);
    Route::put('/{id}', [TransportRequestController::class, 'update']);
    Route::delete('/{id}', [TransportRequestController::class, 'destroy']);
    Route::post('/{id}/assign', [TransportRequestController::class, 'assign']);
    Route::post('/{id}/reject', [TransportRequestController::class, 'reject']);
    Route::post('/{id}/attach-invoices', [TransportRequestController::class, 'attachInvoices']);
    Route::post('/{id}/detach-invoices', [TransportRequestController::class, 'detachInvoices']);
});

// Manifest routes
Route::prefix('manifests')->group(function () {
    Route::get('/', [ManifestController::class, 'index']);
    Route::post('/', [ManifestController::class, 'store']);
    Route::get('/{id}', [ManifestController::class, 'show']);
    Route::get('/{id}/download-pdf', [ManifestController::class, 'downloadPdf']);
    Route::put('/{id}', [ManifestController::class, 'update']);
    Route::delete('/{id}', [ManifestController::class, 'destroy']);
    Route::post('/{id}/submit-feri', [ManifestController::class, 'submitFeri']);
    Route::post('/{id}/approve-feri', [ManifestController::class, 'approveFeri']);
    Route::post('/{id}/mark-delivered', [ManifestController::class, 'markDelivered']);
    Route::post('/{id}/attach-invoices', [ManifestController::class, 'attachInvoices']);
    Route::post('/{id}/detach-invoices', [ManifestController::class, 'detachInvoices']);
});

// Webhook routes for n8n integration
Route::prefix('webhook')->group(function () {
    Route::post('/invoice', [WebhookController::class, 'receiveInvoiceData']);
    Route::post('/document', [WebhookController::class, 'receiveDocumentData']);
    Route::post('/pending-document', [WebhookController::class, 'receivePendingDocument']);
    Route::post('/load-confirmation', [WebhookController::class, 'receiveLoadConfirmationExtraction']);
});

// Pending documents (awaiting acknowledgment)
Route::prefix('pending-documents')->group(function () {
    Route::get('/', [WebhookController::class, 'getPendingDocuments']);
    Route::get('/{id}', [WebhookController::class, 'getPendingDocument']);
    Route::post('/{id}/acknowledge', [WebhookController::class, 'acknowledgePendingDocument']);
    Route::post('/{id}/reject', [WebhookController::class, 'rejectPendingDocument']);
});

// Upload routes
Route::post('/upload/invoice', [InvoiceController::class, 'uploadCommercialInvoice']);
Route::post('/upload/invoice-old', [WebhookController::class, 'uploadInvoicePdf']); // Legacy endpoint
Route::post('/upload/load-confirmation', [WebhookController::class, 'uploadLoadConfirmationPdf']);


// Transporter routes
Route::prefix('transporters')->group(function () {
    Route::get('/', [\App\Http\Controllers\Api\TransporterController::class, 'index']);
    Route::post('/', [\App\Http\Controllers\Api\TransporterController::class, 'store']);
    Route::get('/{id}', [\App\Http\Controllers\Api\TransporterController::class, 'show']);
    Route::put('/{id}', [\App\Http\Controllers\Api\TransporterController::class, 'update']);
    Route::delete('/{id}', [\App\Http\Controllers\Api\TransporterController::class, 'destroy']);
});

// Agent routes
Route::prefix('agents')->group(function () {
    Route::get('/', [\App\Http\Controllers\Api\AgentController::class, 'index']);
    Route::post('/', [\App\Http\Controllers\Api\AgentController::class, 'store']);
    Route::get('/{id}', [\App\Http\Controllers\Api\AgentController::class, 'show']);
    Route::put('/{id}', [\App\Http\Controllers\Api\AgentController::class, 'update']);
    Route::delete('/{id}', [\App\Http\Controllers\Api\AgentController::class, 'destroy']);
});
