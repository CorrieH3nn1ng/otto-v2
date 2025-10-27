<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\License;
use App\Models\Invoice;
use App\Models\Document;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class LicenseController extends Controller
{
    /**
     * Get all licenses for a specific Purchase Order
     */
    public function getByPurchaseOrder(int $poId): JsonResponse
    {
        try {
            $licenses = License::where('purchase_order_id', $poId)
                ->orderBy('validation_date', 'desc')
                ->get();

            return response()->json($licenses);
        } catch (\Exception $e) {
            \Log::error('Error fetching licenses: ' . $e->getMessage());
            return response()->json(['error' => 'Failed to fetch licenses'], 500);
        }
    }

    /**
     * Get a specific license by ID
     */
    public function show(int $id): JsonResponse
    {
        try {
            $license = License::with('purchaseOrder')->findOrFail($id);

            return response()->json($license);
        } catch (\Exception $e) {
            \Log::error('Error fetching license: ' . $e->getMessage());
            return response()->json(['error' => 'License not found'], 404);
        }
    }

    /**
     * Delete a license
     */
    public function destroy(int $id): JsonResponse
    {
        try {
            $license = License::findOrFail($id);
            $license->delete();

            return response()->json(['message' => 'License deleted successfully']);
        } catch (\Exception $e) {
            \Log::error('Error deleting license: ' . $e->getMessage());
            return response()->json(['error' => 'Failed to delete license'], 500);
        }
    }

    /**
     * Upload license - saves document first, then calls n8n workflow
     * Workflow handles AI extraction and database operations
     */
    public function upload(Request $request): JsonResponse
    {
        try {
            $request->validate([
                'file' => 'required|file|mimes:pdf|max:10240', // 10MB max
                'purchase_order_id' => 'required|exists:invoices,id'
            ]);

            // Verify the PO exists and is a purchase order
            $po = Invoice::where('id', $request->purchase_order_id)
                ->where('invoice_type', 'purchase_order')
                ->first();

            if (!$po) {
                return response()->json(['error' => 'Invalid Purchase Order'], 422);
            }

            $file = $request->file('file');
            $filename = $file->getClientOriginalName();

            // STEP 1: Save document to storage and database first
            $storagePath = $file->store('licenses', 'public');

            $document = Document::create([
                'invoice_id' => $po->id,
                'document_type' => 'license',
                'original_filename' => $filename,
                'file_path' => $storagePath,
                'file_size_bytes' => $file->getSize(),
            ]);

            // STEP 2: Call existing n8n workflow (workflow handles everything else)
            $fileContents = base64_encode(file_get_contents($file->getRealPath()));
            $n8nWebhookUrl = env('N8N_LICENSE_WEBHOOK_URL', 'http://localhost:5678/webhook/license-upload');

            $client = new \GuzzleHttp\Client();
            $response = $client->post($n8nWebhookUrl, [
                'json' => [
                    'file' => [
                        'data' => $fileContents,
                        'mimeType' => $file->getMimeType(),
                        'fileName' => $filename
                    ],
                    'original_filename' => $filename,
                    'uploaded_at' => now()->toISOString(),
                    'purchase_order_id' => $request->purchase_order_id
                ],
                'timeout' => 120
            ]);

            $result = json_decode($response->getBody()->getContents(), true);

            // Return success with document_id included
            $result['document_id'] = $document->id;
            return response()->json($result);

        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json(['error' => $e->errors()], 422);
        } catch (\GuzzleHttp\Exception\RequestException $e) {
            \Log::error('n8n webhook error: ' . $e->getMessage());
            // Even if workflow fails, document is still saved
            return response()->json([
                'error' => 'Document saved but workflow processing failed',
                'details' => $e->getMessage(),
                'document_id' => $document->id ?? null,
            ], 500);
        } catch (\Exception $e) {
            \Log::error('Error uploading license: ' . $e->getMessage());
            return response()->json(['error' => 'Failed to upload license: ' . $e->getMessage()], 500);
        }
    }
}
