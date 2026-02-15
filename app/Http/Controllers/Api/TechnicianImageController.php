<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\RequestTechnicianImage;
use App\Models\ServiceRequest;
use App\Models\InstallationRequest;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class TechnicianImageController extends Controller
{
    /**
     * Upload images for a request
     *
     * @param Request $request
     * @return \Illuminate\Http\JsonResponse
     */
    public function uploadImages(Request $request)
    {
        // Validate request
        $validated = $request->validate([
            'request_id' => 'required|integer',
            'request_type' => 'required|in:service,installation',
            'images' => 'required|array|max:10',
            'images.*' => 'image|mimes:jpeg,png,jpg,webp|max:5120', // 5MB max
            'notes' => 'nullable|string|max:500'
        ]);

        $technician = auth()->user();

        // Verify technician is assigned to this request
        if ($validated['request_type'] === 'service') {
            $requestModel = ServiceRequest::find($validated['request_id']);
        } else {
            $requestModel = InstallationRequest::find($validated['request_id']);
        }

        if (!$requestModel) {
            return response()->json([
                'success' => false,
                'message' => 'Request not found'
            ], 404);
        }

        // Check if technician is assigned to this request
        if ($requestModel->technician_id !== $technician->id) {
            return response()->json([
                'success' => false,
                'message' => 'You are not assigned to this request'
            ], 403);
        }

        $uploadedImages = [];

        // Upload each image
        foreach ($request->file('images') as $image) {
            // Store image in public storage
            $path = $image->store('technician_images', 'public');

            // Create database record
            $techImage = RequestTechnicianImage::create([
                'request_id' => $validated['request_id'],
                'request_type' => $validated['request_type'],
                'technician_id' => $technician->id,
                'image_path' => $path,
                'notes' => $validated['notes'] ?? null
            ]);

            // Load technician relationship
            $techImage->load('technician');

            $uploadedImages[] = [
                'id' => $techImage->id,
                'image_url' => $techImage->image_url,
                'technician' => [
                    'id' => $techImage->technician->id,
                    'name' => $techImage->technician->name
                ],
                'notes' => $techImage->notes,
                'uploaded_at' => $techImage->created_at->toISOString()
            ];
        }

        return response()->json([
            'success' => true,
            'message' => 'Images uploaded successfully',
            'data' => [
                'uploaded_count' => count($uploadedImages),
                'images' => $uploadedImages
            ]
        ]);
    }

    /**
     * Get images for a specific request
     *
     * @param Request $request
     * @return \Illuminate\Http\JsonResponse
     */
    public function getImages(Request $request)
    {
        $validated = $request->validate([
            'request_id' => 'required|integer',
            'request_type' => 'required|in:service,installation'
        ]);

        $images = RequestTechnicianImage::where([
            'request_id' => $validated['request_id'],
            'request_type' => $validated['request_type']
        ])
        ->with('technician')
        ->orderBy('created_at', 'desc')
        ->get()
        ->map(function ($image) {
            return [
                'id' => $image->id,
                'image_url' => $image->image_url,
                'technician' => [
                    'id' => $image->technician->id,
                    'name' => $image->technician->name
                ],
                'notes' => $image->notes,
                'uploaded_at' => $image->created_at->toISOString()
            ];
        });

        return response()->json([
            'success' => true,
            'data' => $images
        ]);
    }

    /**
     * Delete a technician image
     *
     * @param int $id
     * @return \Illuminate\Http\JsonResponse
     */
    public function deleteImage($id)
    {
        $image = RequestTechnicianImage::find($id);

        if (!$image) {
            return response()->json([
                'success' => false,
                'message' => 'Image not found'
            ], 404);
        }

        $technician = auth()->user();

        // Only the technician who uploaded or admin can delete
        if ($image->technician_id !== $technician->id && $technician->role !== 'admin') {
            return response()->json([
                'success' => false,
                'message' => 'Unauthorized'
            ], 403);
        }

        // Delete file from storage
        if (Storage::disk('public')->exists($image->image_path)) {
            Storage::disk('public')->delete($image->image_path);
        }

        // Delete database record
        $image->delete();

        return response()->json([
            'success' => true,
            'message' => 'Image deleted successfully'
        ]);
    }
}
