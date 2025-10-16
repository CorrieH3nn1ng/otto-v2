<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\LoadConfirmation;
use App\Models\LoadConfirmationActivity;
use App\Models\Invoice;
use App\Mail\LoadConfirmationEmail;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Mail;

class LoadConfirmationController extends Controller
{
    /**
     * Get all load confirmations
     */
    public function index(Request $request): JsonResponse
    {
        $query = LoadConfirmation::with(['transporter', 'invoices']);

        // Filter by status if provided
        if ($request->has('status')) {
            $statuses = explode(',', $request->status);
            $query->whereIn('status', $statuses);
        }

        $loadConfirmations = $query->orderBy('created_at', 'desc')->get();

        return response()->json($loadConfirmations);
    }

    /**
     * Get a single load confirmation
     */
    public function show(int $id): JsonResponse
    {
        $loadConfirmation = LoadConfirmation::with([
            'transporter',
            'invoices.customer',
            'invoices.supplier',
            'manifests'
        ])->findOrFail($id);

        return response()->json($loadConfirmation);
    }

    /**
     * Create a load confirmation (Transport Planner confirms transport request)
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'file_reference' => 'required|string|unique:load_confirmations',
            'confirmation_date' => 'nullable|date',
            'collection_date' => 'nullable|date',
            'transporter_id' => 'nullable|exists:transporters,id',
            'transporter_name' => 'nullable|string',
            'attention' => 'nullable|string',
            'contact_details' => 'nullable|string',
            'currency' => 'nullable|string|size:3',
            'vehicle_type' => 'nullable|string',
            'truck_registration' => 'nullable|string',
            'trailer_1_registration' => 'nullable|string',
            'trailer_2_registration' => 'nullable|string',
            'clearing_agent' => 'nullable|string',
            'entry_agent' => 'nullable|string',
            'collection_address' => 'nullable|string',
            'collection_address_2' => 'nullable|string',
            'delivery_address' => 'nullable|string',
            'commodity_description' => 'nullable|string',
            'contact_for_nucleus_drc' => 'nullable|string',
            'straps' => 'boolean',
            'chains' => 'boolean',
            'tarpaulin' => 'boolean',
            'corner_plates' => 'boolean',
            'uprights' => 'boolean',
            'rubber_protection' => 'boolean',
            'invoice_ids' => 'nullable|array',
            'invoice_ids.*' => 'exists:invoices,id',
        ]);

        // Create load confirmation
        $loadConfirmation = LoadConfirmation::create([
            'file_reference' => $validated['file_reference'],
            'confirmation_date' => $validated['confirmation_date'],
            'collection_date' => $validated['collection_date'],
            'transporter_id' => $validated['transporter_id'],
            'transporter_name' => $validated['transporter_name'] ?? null,
            'attention' => $validated['attention'] ?? null,
            'contact_details' => $validated['contact_details'] ?? null,
            'currency' => $validated['currency'] ?? 'ZAR',
            'vehicle_type' => $validated['vehicle_type'] ?? null,
            'truck_registration' => $validated['truck_registration'] ?? null,
            'trailer_1_registration' => $validated['trailer_1_registration'] ?? null,
            'trailer_2_registration' => $validated['trailer_2_registration'] ?? null,
            'clearing_agent' => $validated['clearing_agent'] ?? null,
            'entry_agent' => $validated['entry_agent'] ?? null,
            'collection_address' => $validated['collection_address'] ?? null,
            'collection_address_2' => $validated['collection_address_2'] ?? null,
            'delivery_address' => $validated['delivery_address'] ?? null,
            'commodity_description' => $validated['commodity_description'] ?? null,
            'contact_for_nucleus_drc' => $validated['contact_for_nucleus_drc'] ?? null,
            'straps' => $validated['straps'] ?? false,
            'chains' => $validated['chains'] ?? false,
            'tarpaulin' => $validated['tarpaulin'] ?? false,
            'corner_plates' => $validated['corner_plates'] ?? false,
            'uprights' => $validated['uprights'] ?? false,
            'rubber_protection' => $validated['rubber_protection'] ?? false,
            'status' => 'draft',
        ]);

        // Attach invoices to load confirmation if provided
        if (!empty($validated['invoice_ids'])) {
            $loadConfirmation->invoices()->attach($validated['invoice_ids']);

            // Update invoice workflow
            foreach ($validated['invoice_ids'] as $invoiceId) {
                $invoice = Invoice::find($invoiceId);
                if ($invoice) {
                    $invoice->update([
                        'current_stage' => 'transport_requested',
                        'blocked_waiting_for_transport_planner' => false,
                        'current_owner' => 'transport_planner',
                    ]);
                }
            }
        }

        return response()->json($loadConfirmation->load(['transporter', 'invoices']), 201);
    }

    /**
     * Update a load confirmation
     */
    public function update(Request $request, int $id): JsonResponse
    {
        $loadConfirmation = LoadConfirmation::findOrFail($id);

        $validated = $request->validate([
            'file_reference' => 'string|unique:load_confirmations,file_reference,' . $id,
            'confirmation_date' => 'date',
            'collection_date' => 'date',
            'transporter_id' => 'exists:transporters,id',
            'transporter_name' => 'nullable|string',
            'attention' => 'nullable|string',
            'contact_details' => 'nullable|string',
            'vehicle_type' => 'nullable|string',
            'truck_registration' => 'nullable|string',
            'trailer_1_registration' => 'nullable|string',
            'trailer_2_registration' => 'nullable|string',
            'clearing_agent' => 'nullable|string',
            'entry_agent' => 'nullable|string',
            'collection_address' => 'nullable|string',
            'collection_address_2' => 'nullable|string',
            'delivery_address' => 'nullable|string',
            'commodity_description' => 'nullable|string',
            'contact_for_nucleus_drc' => 'nullable|string',
            'straps' => 'boolean',
            'chains' => 'boolean',
            'tarpaulin' => 'boolean',
            'corner_plates' => 'boolean',
            'uprights' => 'boolean',
            'rubber_protection' => 'boolean',
            'status' => 'string',
            'pdf_generated' => 'boolean',
            'email_sent' => 'boolean',
        ]);

        $loadConfirmation->update($validated);

        return response()->json($loadConfirmation->load(['transporter', 'invoices']));
    }

    /**
     * Delete a load confirmation
     */
    public function destroy(int $id): JsonResponse
    {
        $loadConfirmation = LoadConfirmation::with(['transporter', 'invoices'])->findOrFail($id);

        // Log deletion activity with all relevant data before deletion
        LoadConfirmationActivity::create([
            'load_confirmation_id' => $loadConfirmation->id,
            'activity_type' => 'deleted',
            'user_name' => 'System', // TODO: Replace with actual authenticated user when auth is implemented
            'description' => 'Load Confirmation deleted: ' . $loadConfirmation->file_reference,
            'metadata' => [
                'file_reference' => $loadConfirmation->file_reference,
                'status' => $loadConfirmation->status,
                'transporter_name' => $loadConfirmation->transporter_name,
                'vehicle_type' => $loadConfirmation->vehicle_type,
                'collection_date' => $loadConfirmation->collection_date?->format('Y-m-d'),
                'confirmation_date' => $loadConfirmation->confirmation_date?->format('Y-m-d'),
                'invoice_ids' => $loadConfirmation->invoices->pluck('id')->toArray(),
                'invoice_numbers' => $loadConfirmation->invoices->pluck('invoice_number')->toArray(),
                'deleted_at' => now()->toDateTimeString(),
            ],
        ]);

        // Revert invoice workflow state
        foreach ($loadConfirmation->invoices as $invoice) {
            $invoice->update([
                'current_stage' => 'ready_for_transport',
                'blocked_waiting_for_transport_planner' => true,
                'current_owner' => 'transport_planner',
            ]);
        }

        $loadConfirmation->delete();

        return response()->json(['message' => 'Load confirmation deleted successfully']);
    }

    /**
     * Attach invoices to load confirmation
     */
    public function attachInvoices(Request $request, int $id): JsonResponse
    {
        $loadConfirmation = LoadConfirmation::findOrFail($id);

        $validated = $request->validate([
            'invoice_ids' => 'required|array',
            'invoice_ids.*' => 'exists:invoices,id',
        ]);

        $loadConfirmation->invoices()->syncWithoutDetaching($validated['invoice_ids']);

        return response()->json([
            'message' => 'Invoices attached successfully',
            'load_confirmation' => $loadConfirmation->load('invoices')
        ]);
    }

    /**
     * Detach invoices from load confirmation
     */
    public function detachInvoices(Request $request, int $id): JsonResponse
    {
        $loadConfirmation = LoadConfirmation::findOrFail($id);

        $validated = $request->validate([
            'invoice_ids' => 'required|array',
            'invoice_ids.*' => 'exists:invoices,id',
        ]);

        $loadConfirmation->invoices()->detach($validated['invoice_ids']);

        return response()->json([
            'message' => 'Invoices detached successfully',
            'load_confirmation' => $loadConfirmation->load('invoices')
        ]);
    }

    /**
     * Request transport for a load confirmation
     */
    public function requestTransport(int $id): JsonResponse
    {
        $loadConfirmation = LoadConfirmation::with('invoices')->findOrFail($id);

        // Check if load confirmation is in draft status
        if ($loadConfirmation->status !== 'draft') {
            return response()->json([
                'error' => 'Transport has already been requested for this load confirmation.'
            ], 422);
        }

        // Update status to pending transport
        $loadConfirmation->update([
            'status' => 'pending_transport'
        ]);

        return response()->json([
            'message' => 'Transport requested successfully. Awaiting transporter confirmation.',
            'load_confirmation' => $loadConfirmation->fresh(['transporter', 'invoices'])
        ]);
    }

    /**
     * Email load confirmation to transporter
     */
    public function emailLoadConfirmation(Request $request, int $id): JsonResponse
    {
        $loadConfirmation = LoadConfirmation::with('transporter')->findOrFail($id);

        $validated = $request->validate([
            'recipient_email' => 'nullable|email',
            'cc_emails' => 'nullable|array',
            'cc_emails.*' => 'email',
            'pdf_path' => 'nullable|string',
        ]);

        // Determine recipient email
        $recipientEmail = $validated['recipient_email']
            ?? $loadConfirmation->transporter?->email
            ?? null;

        if (!$recipientEmail) {
            return response()->json([
                'error' => 'No recipient email address available. Please provide a recipient email or ensure the transporter has an email address on file.'
            ], 422);
        }

        try {
            // Send email
            $mail = Mail::to($recipientEmail);

            // Add CC recipients if provided
            if (!empty($validated['cc_emails'])) {
                $mail->cc($validated['cc_emails']);
            }

            // Send the email with optional PDF attachment
            $mail->send(new LoadConfirmationEmail(
                $loadConfirmation,
                $validated['pdf_path'] ?? null
            ));

            // Mark as emailed
            $loadConfirmation->update([
                'email_sent' => true,
                'status' => 'transport_confirmed'
            ]);

            return response()->json([
                'message' => 'Load confirmation emailed successfully to ' . $recipientEmail,
                'load_confirmation' => $loadConfirmation->fresh(['transporter', 'invoices'])
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'error' => 'Failed to send email: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Assign transporter and vehicle details to load confirmation (Transport Planner)
     */
    public function assign(Request $request, int $id): JsonResponse
    {
        $loadConfirmation = LoadConfirmation::findOrFail($id);

        $validated = $request->validate([
            'transporter_id' => 'required|exists:transporters,id',
            'transporter_name' => 'required|string|max:255',
            'confirmation_date' => 'required|date',
            'vehicle_type' => 'required|string|max:255',
            'truck_registration' => 'required|string|max:255',
            'trailer_1_registration' => 'nullable|string|max:255',
            'trailer_2_registration' => 'nullable|string|max:255',
            'driver_name' => 'required|string|max:255',
            'driver_contact' => 'required|string|max:255',
            'planner_notes' => 'nullable|string',
        ]);

        // Only allow assignment if in draft status
        if ($loadConfirmation->status !== 'draft') {
            return response()->json([
                'error' => 'This load confirmation has already been assigned.'
            ], 422);
        }

        // Update load confirmation with assignment details
        $loadConfirmation->update([
            'transporter_id' => $validated['transporter_id'],
            'transporter_name' => $validated['transporter_name'],
            'confirmation_date' => $validated['confirmation_date'],
            'vehicle_type' => $validated['vehicle_type'],
            'truck_registration' => $validated['truck_registration'],
            'trailer_1_registration' => $validated['trailer_1_registration'] ?? null,
            'trailer_2_registration' => $validated['trailer_2_registration'] ?? null,
            'attention' => $validated['driver_name'],
            'contact_details' => $validated['driver_contact'],
            'status' => 'transport_confirmed',
        ]);

        return response()->json([
            'message' => 'Transport assigned successfully and load confirmation updated.',
            'load_confirmation' => $loadConfirmation->fresh(['transporter', 'invoices'])
        ]);
    }
}
