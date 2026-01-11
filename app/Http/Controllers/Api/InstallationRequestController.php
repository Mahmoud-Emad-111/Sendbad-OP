<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;

use App\Models\InstallationRequest;
use App\Models\RequestAttachment;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class InstallationRequestController extends Controller
{
    /**
     * List Installation Requests
     */
    public function index(Request $request)
    {
        $user = $request->user();
        $query = InstallationRequest::with(['user', 'technician', 'attachments']);

        if ($user->role === 'customer') {
            $query->where('user_id', $user->id);
        } elseif ($user->role === 'technician') {
            $query->where('technician_id', $user->id);
        }

        // Filtering Logic
        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function($q) use ($search) {
                $q->where('id', 'like', "%{$search}%")
                  ->orWhereHas('user', function($q) use ($search) {
                      $q->where('name', 'like', "%{$search}%")
                        ->orWhere('phone', 'like', "%{$search}%");
                  });
            });
        }

        if ($request->filled('status') && $request->status !== 'all') {
            $query->where('status', $request->status);
        }

        if ($request->filled('date_from')) {
            $query->whereDate('scheduled_at', '>=', $request->date_from);
        }
        if ($request->filled('date_to')) {
            $query->whereDate('scheduled_at', '<=', $request->date_to);
        }

        return response()->json([
            'success' => true,
            'data' => $query->latest()->get()
        ]);
    }

    /**
     * Store new Installation Request
     */
    public function store(Request $request)
    {
        $request->validate([
            'product_type' => 'required|string',
            'quantity' => 'required|integer|min:1',
            'is_site_ready' => 'required|boolean',
            'readiness_details' => 'array', // Optional, defaults to []
            'notes' => 'nullable|string',
            'latitude' => 'required|numeric',
            'longitude' => 'required|numeric',
            'address' => 'required|string',
            'scheduled_at' => 'required|date',
            'images.*' => 'image|mimes:jpeg,png,jpg,gif|max:5120'
        ]);

        try {
            DB::beginTransaction();

            $installationRequest = InstallationRequest::create([
                'user_id' => $request->user()->id,
                'product_type' => $request->product_type,
                'quantity' => $request->quantity,
                'is_site_ready' => $request->boolean('is_site_ready'),
                'readiness_details' => $request->readiness_details ?? [],
                'notes' => $request->notes,
                'address' => $request->address,
                'latitude' => $request->latitude,
                'longitude' => $request->longitude,
                'scheduled_at' => $request->scheduled_at,
                'status' => 'pending'
            ]);

            // Handle Images
            if ($request->hasFile('images')) {
                $images = $request->file('images');
                if (!is_array($images)) $images = [$images];

                foreach ($images as $image) {
                    $path = $image->store('installation_requests', 'public');
                    $installationRequest->attachments()->create([
                        'file_path' => $path,
                        'file_type' => 'image'
                    ]);
                }
            }

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'تم استلام طلب التركيب بنجاح',
                'data' => $installationRequest
            ]);

        } catch (\Exception $e) {
            DB::rollBack();
            Log::error("Installation Request Error: " . $e->getMessage());
            return response()->json(['success' => false, 'message' => 'حدث خطأ غير متوقع'], 500);
        }
    }

    public function show($id)
    {
        $request = InstallationRequest::with(['user', 'technician', 'attachments'])->findOrFail($id);
        return response()->json(['success' => true, 'data' => $request]);
    }

    /**
     * Update Request Status
     */
    public function updateStatus(Request $request, $id)
    {
        $request->validate([
            'status' => 'required|in:pending,assigned,on_way,in_progress,completed,canceled',
            'send_notification' => 'boolean'
        ]);

        $installationRequest = InstallationRequest::findOrFail($id);

        if ($request->user()->role !== 'admin' && $installationRequest->technician_id !== $request->user()->id) {
            return response()->json(['success' => false, 'message' => 'Unauthorized'], 403);
        }

        $installationRequest->update(['status' => $request->status]);

        // Notify Logic (Simplified)
        if ($request->boolean('send_notification', false)) {
            // Send notification logic here (omitted for brevity, or inject service)
        }

        return response()->json([
            'success' => true,
            'message' => 'Status updated successfully',
            'data' => $installationRequest
        ]);
    }

    /**
     * Assign Technician
     */
    public function assignTechnician(Request $request, $id)
    {
        $request->validate([
            'technician_id' => 'required|exists:users,id'
        ]);

        $installationRequest = InstallationRequest::findOrFail($id);
        $installationRequest->update([
            'technician_id' => $request->technician_id,
            'status' => 'assigned'
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Technician assigned successfully',
            'data' => $installationRequest
        ]);
    }
}
