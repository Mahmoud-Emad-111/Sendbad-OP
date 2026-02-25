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
    protected $notificationService;
    protected $activityLogger;

    public function __construct(
        \App\Services\NotificationService $notificationService,
        \App\Services\ActivityLogger $activityLogger
    ) {
        $this->notificationService = $notificationService;
        $this->activityLogger = $activityLogger;
    }


    /**
     * List Installation Requests
     */
    public function index(Request $request)
    {
        $user = $request->user();
        $query = InstallationRequest::with(['user', 'technician', 'attachments', 'rating']);

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
                  ->orWhere('invoice_number', 'like', "%{$search}%")
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
            'data' => \App\Http\Resources\InstallationRequestResource::collection($query->latest()->get())
        ]);
    }

    /**
     * Store new Installation Request
     */
    public function store(\App\Http\Requests\StoreInstallationRequest $request)
    {
        // Validation handled by FormRequest

        try {
            DB::beginTransaction();

            $installationRequest = InstallationRequest::create([
                'user_id' => $request->user()->id,
                'product_type' => $request->product_type,
                // 'quantity' => $request->quantity,
                'invoice_number' => 'B-' . $request->invoice_number,
                'is_site_ready' => $request->boolean('is_site_ready'),
                'readiness_details' => $request->readiness_details ?? [],
                'notes' => $request->notes,
                'address' => $request->address,
                'latitude' => $request->latitude,
                'longitude' => $request->longitude,
                'scheduled_at' => $request->scheduled_at,
                'end_date' => $request->end_date ?? $request->scheduled_at,
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

            // Notify Admins
            $admins = \App\Models\User::where('role', 'admin')->get();
            foreach ($admins as $admin) {
                 if ($admin->fcm_token) {
                     $this->notificationService->sendNotification(
                         $admin->fcm_token,
                         'طلب تركيب جديد 🔧',
                         "تم استلام طلب تركيب جديد #{$installationRequest->id} من {$request->user()->name}",
                         ['request_id' => (string) $installationRequest->id, 'type' => 'new_installation_request', 'request_type' => 'installation']
                     );
                 } else {
                     \App\Models\Notification::create([
                        'recipient_id' => $admin->id,
                        'title' => 'طلب تركيب جديد 🔧',
                        'body' => "تم استلام طلب تركيب جديد #{$installationRequest->id} من {$request->user()->name}",
                        'type' => 'new_installation_request',
                        'data' => ['request_id' => (string) $installationRequest->id, 'type' => 'new_installation_request', 'request_type' => 'installation'],
                     ]);
                 }
            }

            // Log Activity
            $this->activityLogger->log(
                $installationRequest,
                'created',
                'تم إنشاء طلب التركيب',
                ['status' => 'pending']
            );

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
        $request = InstallationRequest::with(['user', 'technician', 'attachments', 'rating', 'activities.user'])->findOrFail($id);

        // Load technician images
        $technicianImages = \App\Models\RequestTechnicianImage::where([
            'request_id' => $id,
            'request_type' => 'installation'
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

        $request->technician_images = $technicianImages;

        return response()->json(['success' => true, 'data' => $request]);
    }

    public function acceptRequest(\App\Http\Requests\AcceptInstallationRequest $request)
    {
        // Validation handled by FormRequest
        $installationRequest = InstallationRequest::find($request->id);

        $installationRequest->technician_accepted_at = now();
        $installationRequest->save();

        // Notify customer
        if ($installationRequest->user) {
            $this->notificationService->sendNotification(
                $installationRequest->user,
                'Installation Request Accepted',
                "Your installation request #{$installationRequest->id} has been accepted by the technician.",
                ['type' => 'installation_request_update', 'request_id' => $installationRequest->id, 'request_type' => 'installation']
            );
        }

        // Log Activity
        $this->activityLogger->log(
            $installationRequest,
            'technician_accepted',
            'تم قبول الطلب من قبل الفني',
            ['status' => 'on_way', 'technician_id' => $request->user()->id]
        );

        return response()->json([
            'success' => true,
            'message' => 'Request accepted successfully',
            'data' => $installationRequest
        ]);
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

        $updates = ['status' => $request->status];
        if ($request->status === 'completed') {
            $updates['completed_at'] = now();
        } elseif ($installationRequest->status === 'completed' && $request->status !== 'completed') {
            $updates['completed_at'] = null;
        }

        $installationRequest->update($updates);


        // Notify Logic
        if ($request->boolean('send_notification', false)) {
            $customer = $installationRequest->user;
            if ($customer) {
                $statusLabels = [
                    'pending' => 'قيد الانتظار',
                    'assigned' => 'تم إسناد الفني',
                    'on_way' => 'الفني في الطريق إليك 🚚',
                    'in_progress' => 'جاري العمل ⚙️',
                    'completed' => 'تم التركيب بنجاح ✅',
                    'canceled' => 'تم إلغاء الطلب ❌'
                ];

                $statusText = $statusLabels[$request->status] ?? $request->status;
                $arabicStatus = $statusLabels[$request->status] ?? $request->status; // Assuming $arabicStatus is derived from $statusLabels

                $this->notificationService->sendNotification(
                    $installationRequest->user,
                    'تحديث حالة طلب التركيب',
                    "تم تحديث حالة طلب التركيب #{$installationRequest->id} إلى: {$arabicStatus}",
                    ['request_id' => (string) $installationRequest->id, 'type' => 'status_update', 'request_type' => 'installation']
                );
            }
        }

        // Log Activity
        $statusLabels = [
            'pending' => 'قيد الانتظار',
            'assigned' => 'تم الإسناد',
            'on_way' => 'الفني في الطريق',
            'in_progress' => 'جاري التنفيذ',
            'completed' => 'مكتمل',
            'canceled' => 'ملغي'
        ];

        $this->activityLogger->log(
            $installationRequest,
            'status_updated',
            "تم تحديث الحالة إلى: " . ($statusLabels[$request->status] ?? $request->status),
            ['new_status' => $request->status]
        );

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
            'technician_id' => 'required|exists:users,id',
            'scheduled_at' => 'nullable|date',
            'end_date' => 'nullable|date|after_or_equal:scheduled_at'
        ]);

        $installationRequest = InstallationRequest::findOrFail($id);

        $updateData = [
            'technician_id' => $request->technician_id,
            'status' => 'assigned'
        ];

        if ($request->filled('scheduled_at')) {
            $updateData['scheduled_at'] = $request->scheduled_at;
        }
        if ($request->filled('end_date')) {
            $updateData['end_date'] = $request->end_date;
        }

        $installationRequest->update($updateData);

        $technician = \App\Models\User::find($request->technician_id);
        $customer = $installationRequest->user;

        $visitDate = $installationRequest->scheduled_at ? $installationRequest->scheduled_at->format('Y-m-d H:i') : 'غير محدد';
        $endDate = $installationRequest->end_date ? $installationRequest->end_date->format('Y-m-d') : 'غير محدد';

        // 1. Notify Technician
        if ($technician && $technician->fcm_token) {
            $this->notificationService->sendNotification(
                $technician->fcm_token,
                'مهمة تركيب جديدة 🛠️',
                "تم تعيين طلب تركيب جديد لك: #{$installationRequest->id}\nالعنوان: {$installationRequest->address}\nتاريخ الزيارة: {$visitDate}\nتاريخ التسليم: {$endDate}",
                [
                    'request_id' => (string) $installationRequest->id,
                    'type' => 'assignment',
                    'request_type' => 'installation',
                    'visit_date' => $visitDate,
                    'end_date' => $endDate
                ]
            );
        }

        // 2. Notify Customer
        if ($customer && $customer->fcm_token) {
            $techName = $technician ? $technician->name : 'فني';
            $this->notificationService->sendNotification(
                $customer->fcm_token,
                'تم تحديد موعد الزيارة 📅',
                "تم تعيين الفني {$techName} لطلب التركيب #{$installationRequest->id}.\nموعد الزيارة: {$visitDate}\nتاريخ التسليم المتوقع: {$endDate}",
                ['request_id' => (string) $installationRequest->id, 'type' => 'status_update', 'request_type' => 'installation']
            );
        }

        // Log Activity
        $this->activityLogger->log(
            $installationRequest,
            'assigned',
            "تم تعيين الفني: " . ($technician ? $technician->name : 'غير محدد'),
            ['technician_id' => $request->technician_id, 'visit_date' => $visitDate]
        );

        return response()->json([
            'success' => true,
            'message' => 'Technician assigned and parties notified successfully',
            'data' => $installationRequest
        ]);
    }
    public function updateReadiness(Request $request, $id)
    {
        $installationRequest = InstallationRequest::findOrFail($id);

        $validated = $request->validate([
            'is_site_ready' => 'required|boolean',
            'readiness_details' => 'nullable|array',
        ]);

        $installationRequest->update([
            'is_site_ready' => $validated['is_site_ready'],
            'readiness_details' => $validated['readiness_details'] ?? [],
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Readiness details updated successfully',
            'data' => $installationRequest
        ]);
    }
    /**
     * Delete Installation Request (Admin Only)
     */
    public function destroy(Request $request, $id)
    {
        if ($request->user()->role !== 'admin') {
            return response()->json(['success' => false, 'message' => 'Unauthorized'], 403);
        }

        $installationRequest = InstallationRequest::findOrFail($id);
        $installationRequest->delete();

        return response()->json([
            'success' => true,
            'message' => 'Installation request deleted successfully'
        ]);
    }

    /**
     * Bulk delete installation requests
     */
    public function bulkDestroy(Request $request)
    {
        if ($request->user()->role !== 'admin') {
            return response()->json(['success' => false, 'message' => 'Unauthorized'], 403);
        }

        $request->validate([
            'ids' => 'required|array',
            'ids.*' => 'exists:installation_requests,id'
        ]);

        try {
            $deletedCount = InstallationRequest::whereIn('id', $request->ids)->delete();

            return response()->json([
                'success' => true,
                'message' => "$deletedCount installation request(s) deleted successfully",
                'deleted_count' => $deletedCount
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error deleting requests: ' . $e->getMessage()
            ], 500);
        }
    }
    /**
     * Submit/Update Rating for Installation Request
     */
    public function submitRating(\App\Http\Requests\RatingRequest $request, $id)
    {
        $user = $request->user();
        $installationRequest = InstallationRequest::findOrFail($id);

        if ($installationRequest->user_id !== $user->id) {
            return response()->json(['success' => false, 'message' => 'Unauthorized'], 403);
        }

        // Handle Image Upload
        $imagePath = null;
        if ($request->hasFile('image')) {
            $imagePath = $request->file('image')->store('ratings', 'public');
        }

        // Check if rating exists
        $existingRating = \App\Models\Rating::where('request_id', $id)
            ->where('request_type', 'installation')
            ->first();

        // Prevent duplicate rating
        if ($existingRating) {
            // If it's the SAME user trying to rate again -> Error
            // If we wanted to allow *updating* the rating, we would skip this check.
            // But the requirement is "User cannot rate again".
            return response()->json(['success' => false, 'message' => 'لقد قمت بتقييم هذا الطلب مسبقاً'], 400);
        }

        // Prepare data for updateOrCreate
        $data = [
            'user_id' => $user->id,
            'product_rating' => $request->product_rating,
            'service_rating' => $request->service_rating,
            'how_found_us' => $request->how_found_us,
            'customer_notes' => $request->customer_notes,
        ];

        if ($imagePath) {
            $data['image_path'] = $imagePath;
        }

        // Create or update rating
        $rating = \App\Models\Rating::updateOrCreate(
            [
                'request_id' => $id,
                'request_type' => 'installation',
            ],
            $data
        );

        return response()->json([
            'success' => true,
            'message' => 'Rating submitted successfully',
            'data' => $rating
        ]);
    }
}
