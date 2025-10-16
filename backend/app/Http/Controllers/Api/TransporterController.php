<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Transporter;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class TransporterController extends Controller
{
    /**
     * Get all transporters
     */
    public function index(): JsonResponse
    {
        $transporters = Transporter::orderBy('company_name', 'asc')->get();

        return response()->json($transporters);
    }

    /**
     * Store a new transporter
     */
    public function store(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'company_name' => 'required|string|max:255',
            'contact_person' => 'required|string|max:255',
            'phone' => 'required|string|max:255',
            'email' => 'nullable|email|max:255',
            'vehicle_types' => 'nullable|string',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $transporter = Transporter::create($request->all());

        return response()->json([
            'message' => 'Transporter created successfully.',
            'transporter' => $transporter
        ], 201);
    }

    /**
     * Get a single transporter
     */
    public function show(int $id): JsonResponse
    {
        $transporter = Transporter::findOrFail($id);

        return response()->json($transporter);
    }

    /**
     * Update a transporter
     */
    public function update(Request $request, int $id): JsonResponse
    {
        $transporter = Transporter::findOrFail($id);

        $validator = Validator::make($request->all(), [
            'company_name' => 'string|max:255',
            'contact_person' => 'string|max:255',
            'phone' => 'string|max:255',
            'email' => 'nullable|email|max:255',
            'vehicle_types' => 'nullable|string',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $transporter->update($request->all());

        return response()->json([
            'message' => 'Transporter updated successfully.',
            'transporter' => $transporter->fresh()
        ]);
    }

    /**
     * Delete a transporter
     */
    public function destroy(int $id): JsonResponse
    {
        $transporter = Transporter::findOrFail($id);
        $transporter->delete();

        return response()->json([
            'message' => 'Transporter deleted successfully.'
        ]);
    }
}
