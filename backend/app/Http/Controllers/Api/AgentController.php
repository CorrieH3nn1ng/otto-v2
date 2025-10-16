<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Agent;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AgentController extends Controller
{
    /**
     * Get all active agents
     */
    public function index(Request $request): JsonResponse
    {
        $query = Agent::active()->ordered();

        // Optional filter by type
        if ($request->has('type')) {
            $query->ofType($request->type);
        }

        $agents = $query->get();

        return response()->json($agents);
    }

    /**
     * Get a specific agent
     */
    public function show(int $id): JsonResponse
    {
        $agent = Agent::findOrFail($id);
        return response()->json($agent);
    }

    /**
     * Create a new agent (admin only)
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255|unique:agents',
            'type' => 'required|string|in:clearing,entry,exit,both',
            'location' => 'nullable|string|max:255',
            'is_active' => 'boolean',
            'sort_order' => 'integer',
        ]);

        $agent = Agent::create($validated);

        return response()->json([
            'message' => 'Agent created successfully.',
            'agent' => $agent
        ], 201);
    }

    /**
     * Update an existing agent (admin only)
     */
    public function update(Request $request, int $id): JsonResponse
    {
        $agent = Agent::findOrFail($id);

        $validated = $request->validate([
            'name' => 'string|max:255|unique:agents,name,' . $id,
            'type' => 'string|in:clearing,entry,exit,both',
            'location' => 'nullable|string|max:255',
            'is_active' => 'boolean',
            'sort_order' => 'integer',
        ]);

        $agent->update($validated);

        return response()->json([
            'message' => 'Agent updated successfully.',
            'agent' => $agent->fresh()
        ]);
    }

    /**
     * Delete an agent (admin only)
     */
    public function destroy(int $id): JsonResponse
    {
        $agent = Agent::findOrFail($id);
        $agent->delete();

        return response()->json([
            'message' => 'Agent deleted successfully.'
        ]);
    }
}
