<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\TransportRequest;
use App\Models\Invoice;
use App\Models\LoadConfirmation;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;

class TransportRequestController extends Controller
{
    /**
     * Display a listing of transport requests
     */
    public function index(Request $request): JsonResponse
    {
        $query = TransportRequest::with(['transporter', 'invoices', 'loadConfirmation']);

        // Filter by status if provided
        if ($request->has('status')) {
            $query->where('status', $request->status);
        }

        // Order by created date, newest first
        $query->orderBy('created_at', 'desc');

        $transportRequests = $query->get();

        return response()->json($transportRequests);
    }

    /**
     * Store a newly created transport request
     */
    public function store(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'file_ref' => 'required|string|max:255',
            'vehicle_type' => 'required|string|max:255',
            'requested_collection_date' => 'required|date',
            'currency' => 'required|string|size:3',
            'collection_address' => 'nullable|string|max:255',
            'collection_address_2' => 'nullable|string|max:255',
            'delivery_address' => 'nullable|string|max:255',
            'commodity_description' => 'nullable|string',
            'special_requirements' => 'nullable|string',
            'straps' => 'boolean',
            'chains' => 'boolean',
            'tarpaulin' => 'boolean',
            'corner_plates' => 'boolean',
            'uprights' => 'boolean',
            'rubber_protection' => 'boolean',
            'invoice_ids' => 'nullable|array',
            'invoice_ids.*' => 'exists:invoices,id',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        try {
            DB::beginTransaction();

            // Generate unique request reference
            $requestReference = TransportRequest::generateRequestReference();

            // Create transport request
            $transportRequest = TransportRequest::create([
                'request_reference' => $requestReference,
                'file_ref' => $request->file_ref,
                'vehicle_type' => $request->vehicle_type,
                'requested_collection_date' => $request->requested_collection_date,
                'currency' => $request->currency,
                'collection_address' => $request->collection_address,
                'collection_address_2' => $request->collection_address_2,
                'delivery_address' => $request->delivery_address,
                'commodity_description' => $request->commodity_description,
                'special_requirements' => $request->special_requirements,
                'straps' => $request->boolean('straps', false),
                'chains' => $request->boolean('chains', false),
                'tarpaulin' => $request->boolean('tarpaulin', false),
                'corner_plates' => $request->boolean('corner_plates', false),
                'uprights' => $request->boolean('uprights', false),
                'rubber_protection' => $request->boolean('rubber_protection', false),
                'status' => 'pending',
            ]);

            // Attach invoices if provided
            if ($request->has('invoice_ids') && is_array($request->invoice_ids)) {
                $transportRequest->invoices()->attach($request->invoice_ids);
            }

            DB::commit();

            return response()->json([
                'message' => 'Transport request created successfully.',
                'transport_request' => $transportRequest->fresh(['invoices', 'transporter'])
            ], 201);

        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'error' => 'Failed to create transport request.',
                'message' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Display the specified transport request
     */
    public function show(int $id): JsonResponse
    {
        $transportRequest = TransportRequest::with(['transporter', 'invoices', 'loadConfirmation'])
            ->findOrFail($id);

        return response()->json($transportRequest);
    }

    /**
     * Update the specified transport request
     */
    public function update(Request $request, int $id): JsonResponse
    {
        $transportRequest = TransportRequest::findOrFail($id);

        $validator = Validator::make($request->all(), [
            'requested_collection_date' => 'date',
            'collection_address' => 'nullable|string|max:255',
            'collection_address_2' => 'nullable|string|max:255',
            'delivery_address' => 'nullable|string|max:255',
            'commodity_description' => 'nullable|string',
            'special_requirements' => 'nullable|string',
            'straps' => 'boolean',
            'chains' => 'boolean',
            'tarpaulin' => 'boolean',
            'corner_plates' => 'boolean',
            'uprights' => 'boolean',
            'rubber_protection' => 'boolean',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        // Only allow updates if still pending
        if ($transportRequest->status !== 'pending') {
            return response()->json([
                'error' => 'Cannot update transport request that has already been assigned or completed.'
            ], 422);
        }

        $transportRequest->update($request->only([
            'requested_collection_date',
            'collection_address',
            'collection_address_2',
            'delivery_address',
            'commodity_description',
            'special_requirements',
            'straps',
            'chains',
            'tarpaulin',
            'corner_plates',
            'uprights',
            'rubber_protection',
        ]));

        return response()->json([
            'message' => 'Transport request updated successfully.',
            'transport_request' => $transportRequest->fresh(['invoices', 'transporter'])
        ]);
    }

    /**
     * Assign transporter and vehicle details to transport request
     */
    public function assign(Request $request, int $id): JsonResponse
    {
        $transportRequest = TransportRequest::findOrFail($id);

        $validator = Validator::make($request->all(), [
            'transporter_id' => 'required|exists:transporters,id',
            'transporter_name' => 'required|string|max:255',
            'vehicle_type' => 'required|string|max:255',
            'truck_registration' => 'nullable|string|max:255',
            'trailer_1_registration' => 'nullable|string|max:255',
            'trailer_2_registration' => 'nullable|string|max:255',
            'driver_name' => 'nullable|string|max:255',
            'driver_contact' => 'nullable|string|max:255',
            'planner_notes' => 'nullable|string',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        // Only allow assignment if pending
        if (!$transportRequest->canBeAssigned()) {
            return response()->json([
                'error' => 'This transport request has already been assigned.'
            ], 422);
        }

        try {
            DB::beginTransaction();

            // Update transport request with assignment details
            $transportRequest->update([
                'transporter_id' => $request->transporter_id,
                'transporter_name' => $request->transporter_name,
                'vehicle_type' => $request->vehicle_type,
                'truck_registration' => $request->truck_registration,
                'trailer_1_registration' => $request->trailer_1_registration,
                'trailer_2_registration' => $request->trailer_2_registration,
                'driver_name' => $request->driver_name,
                'driver_contact' => $request->driver_contact,
                'planner_notes' => $request->planner_notes,
                'status' => 'assigned',
            ]);

            // Create load confirmation from transport request
            $loadConfirmation = LoadConfirmation::create([
                'transport_request_id' => $transportRequest->id,
                'file_reference' => $transportRequest->file_ref,
                'collection_date' => $transportRequest->requested_collection_date,
                'collection_address' => $transportRequest->collection_address,
                'collection_address_2' => $transportRequest->collection_address_2,
                'delivery_address' => $transportRequest->delivery_address,
                'commodity_description' => $transportRequest->commodity_description,
                'transporter_id' => $transportRequest->transporter_id,
                'transporter_name' => $transportRequest->transporter_name,
                'vehicle_type' => $transportRequest->vehicle_type,
                'truck_registration' => $transportRequest->truck_registration,
                'trailer_1_registration' => $transportRequest->trailer_1_registration,
                'trailer_2_registration' => $transportRequest->trailer_2_registration,
                'straps' => $transportRequest->straps,
                'chains' => $transportRequest->chains,
                'tarpaulin' => $transportRequest->tarpaulin,
                'corner_plates' => $transportRequest->corner_plates,
                'uprights' => $transportRequest->uprights,
                'rubber_protection' => $transportRequest->rubber_protection,
                'status' => 'draft',
            ]);

            // Copy invoice relationships to load confirmation
            $invoiceIds = $transportRequest->invoices()->pluck('invoices.id')->toArray();
            if (!empty($invoiceIds)) {
                $loadConfirmation->invoices()->attach($invoiceIds);
            }

            DB::commit();

            return response()->json([
                'message' => 'Transport request assigned successfully and load confirmation created.',
                'transport_request' => $transportRequest->fresh(['transporter', 'invoices', 'loadConfirmation']),
                'load_confirmation' => $loadConfirmation->fresh(['transporter', 'invoices'])
            ]);

        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'error' => 'Failed to assign transport request.',
                'message' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Reject a transport request
     */
    public function reject(Request $request, int $id): JsonResponse
    {
        $transportRequest = TransportRequest::findOrFail($id);

        $validator = Validator::make($request->all(), [
            'planner_notes' => 'nullable|string',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        if (!$transportRequest->canBeAssigned()) {
            return response()->json([
                'error' => 'This transport request has already been processed.'
            ], 422);
        }

        $transportRequest->update([
            'status' => 'rejected',
            'planner_notes' => $request->planner_notes,
        ]);

        return response()->json([
            'message' => 'Transport request rejected.',
            'transport_request' => $transportRequest->fresh(['invoices'])
        ]);
    }

    /**
     * Delete the specified transport request
     */
    public function destroy(int $id): JsonResponse
    {
        $transportRequest = TransportRequest::findOrFail($id);

        // Only allow deletion if pending
        if ($transportRequest->status !== 'pending') {
            return response()->json([
                'error' => 'Cannot delete transport request that has been assigned or completed.'
            ], 422);
        }

        $transportRequest->delete();

        return response()->json([
            'message' => 'Transport request deleted successfully.'
        ]);
    }

    /**
     * Attach invoices to transport request
     */
    public function attachInvoices(Request $request, int $id): JsonResponse
    {
        $transportRequest = TransportRequest::findOrFail($id);

        $validator = Validator::make($request->all(), [
            'invoice_ids' => 'required|array',
            'invoice_ids.*' => 'exists:invoices,id',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $transportRequest->invoices()->syncWithoutDetaching($request->invoice_ids);

        return response()->json([
            'message' => 'Invoices attached successfully.',
            'transport_request' => $transportRequest->fresh(['invoices'])
        ]);
    }

    /**
     * Detach invoices from transport request
     */
    public function detachInvoices(Request $request, int $id): JsonResponse
    {
        $transportRequest = TransportRequest::findOrFail($id);

        $validator = Validator::make($request->all(), [
            'invoice_ids' => 'required|array',
            'invoice_ids.*' => 'exists:invoices,id',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $transportRequest->invoices()->detach($request->invoice_ids);

        return response()->json([
            'message' => 'Invoices detached successfully.',
            'transport_request' => $transportRequest->fresh(['invoices'])
        ]);
    }
}
