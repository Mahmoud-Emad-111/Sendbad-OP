<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ServiceRequest;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ServiceRequestController extends Controller
{
    /**
     * List requests (Admin sees all, Customer sees theirs)
     */
    protected $notificationService;

    public function __construct(\App\Services\NotificationService $notificationService)
    {
        $this->notificationService = $notificationService;
    }

    /**
     * List requests (Admin sees all, Customer sees theirs)
     */
    public function index(Request $request)
    {
        $user = $request->user();
        $query = \App\Models\ServiceRequest::with(['user', 'technician', 'attachments']);

        if ($user->role === 'customer') {
            $query->where('user_id', $user->id);
        } elseif ($user->role === 'technician') {
            $query->where('technician_id', $user->id);
        }

        // Filters
        if ($request->has('status') && $request->status !== 'all') {
            $query->where('status', $request->status);
        }

        $requests = $query->latest()->get();

        return response()->json([
            'success' => true,
            'data' => $requests
        ]);
    }

    /**
     * Create a new Service Request
     */
    public function store(Request $request)
    {
        \Illuminate\Support\Facades\Log::info('Request Data:', $request->all());
        \Illuminate\Support\Facades\Log::info('Has Images?', ['hasFile' => $request->hasFile('images')]);

        $request->validate([
            'service_type' => 'required|string',
            'description' => 'required|string',
            'address' => 'required|string',
            'scheduled_at' => 'required|date',
            'images.*' => 'image|mimes:jpeg,png,jpg,gif|max:2048'
        ]);

        try {
            DB::beginTransaction();

            $serviceRequest = \App\Models\ServiceRequest::create([
                'user_id' => $request->user()->id,
                'service_type' => $request->service_type, // Free text
                'description' => $request->description,
                'address' => $request->address,
                'scheduled_at' => $request->scheduled_at,
                'latitude' => $request->latitude ?? null,
                'longitude' => $request->longitude ?? null,
                'status' => 'pending'
            ]);

            // Handle Images
            if ($request->hasFile('images')) {
                $images = $request->file('images');
                if (!is_array($images)) {
                    $images = [$images];
                }

                foreach ($images as $image) {
                    try {
                        $path = $image->store('requests', 'public');
                        \App\Models\RequestAttachment::create([
                            'service_request_id' => $serviceRequest->id,
                            'file_path' => $path,
                            'file_type' => 'image'
                        ]);
                    } catch (\Exception $e) {
                         \Illuminate\Support\Facades\Log::error('Image Upload Error: ' . $e->getMessage());
                    }
                }
            }

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'تم إرسال طلبك بنجاح',
                'data' => $serviceRequest->load('attachments')
            ]);

        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['success' => false, 'message' => 'حدث خطأ: ' . $e->getMessage()], 500);
        }
    }

    /**
     * Assign Technician to a Request (Admin Only)
     */
    public function assignTechnician(Request $request, $id)
    {
        $request->validate([
            'technician_id' => 'required|exists:users,id'
        ]);

        $serviceRequest = \App\Models\ServiceRequest::findOrFail($id);

        $serviceRequest->update([
            'technician_id' => $request->technician_id,
            'status' => 'assigned'
        ]);

        // Notify Technician
        $technician = User::find($request->technician_id);
        if ($technician && $technician->fcm_token) {
            $this->notificationService->sendNotification(
                $technician->fcm_token,
                'مهمة جديدة 🛠️',
                "تم تعيين طلب صيانة جديد لك: #{$serviceRequest->id}\nالنوع: {$serviceRequest->service_type}",
                ['request_id' => (string) $serviceRequest->id, 'type' => 'assignment']
            );
        }

        return response()->json([
            'success' => true,
            'message' => 'تم إسناد الطلب للفني بنجاح',
            'data' => $serviceRequest
        ]);
    }

    /**
     * Update Request Status (For Technician using Mobile App)
     */
    public function updateStatus(Request $request, $id)
    {
        $request->validate([
            'status' => 'required|in:pending,assigned,on_way,in_progress,completed,canceled',
            'send_notification' => 'boolean'
        ]);

        $serviceRequest = \App\Models\ServiceRequest::findOrFail($id);

        if ($request->user()->role !== 'admin' && $serviceRequest->technician_id !== $request->user()->id) {
            return response()->json(['success' => false, 'message' => 'غير مصرح لك بتعديل هذا الطلب'], 403);
        }

        $serviceRequest->update([
            'status' => $request->status
        ]);

        // Notify Customer if requested (Default handling if needed, or by flag)
        if ($request->boolean('send_notification', false)) {
            $customer = $serviceRequest->user;
            if ($customer && $customer->fcm_token) {
                $statusLabels = [
                    'pending' => 'قيد الانتظار',
                    'assigned' => 'تم إسناد الفني',
                    'on_way' => 'الفني في الطريق إليك 🚚',
                    'in_progress' => 'جاري العمل على طلبك ⚙️',
                    'completed' => 'تم اكتمال الطلب ✅',
                    'canceled' => 'تم إلغاء الطلب ❌'
                ];

                $statusText = $statusLabels[$request->status] ?? $request->status;

                $this->notificationService->sendNotification(
                    $customer->fcm_token,
                    'تحديث حالة الطلب 🔔',
                    "تم تغيير حالة طلبك #{$serviceRequest->id} إلى: {$statusText}",
                    ['request_id' => (string) $serviceRequest->id, 'type' => 'status_update']
                );
            }
        }

        return response()->json([
            'success' => true,
            'message' => 'تم تحديث حالة الطلب',
            'data' => $serviceRequest
        ]);
    }
}
