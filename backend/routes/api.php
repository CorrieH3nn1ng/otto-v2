<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\InvoiceController;
use App\Http\Controllers\Api\DocumentController;
use App\Http\Controllers\Api\LoadConfirmationController;
use App\Http\Controllers\Api\ManifestController;
use App\Http\Controllers\Api\TransportRequestController;
use App\Http\Controllers\Api\WebhookController;

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
});

// Pending documents (awaiting acknowledgment)
Route::prefix('pending-documents')->group(function () {
    Route::get('/', [WebhookController::class, 'getPendingDocuments']);
    Route::get('/{id}', [WebhookController::class, 'getPendingDocument']);
    Route::post('/{id}/acknowledge', [WebhookController::class, 'acknowledgePendingDocument']);
    Route::post('/{id}/reject', [WebhookController::class, 'rejectPendingDocument']);
});

// Upload route (proxies to n8n)
Route::post('/upload/invoice', [WebhookController::class, 'uploadInvoicePdf']);


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
