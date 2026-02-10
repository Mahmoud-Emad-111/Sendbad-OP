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

    public function __construct(\App\Services\NotificationService $notificationService)
    {
        $this->notificationService = $notificationService;
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
                'quantity' => $request->quantity,
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
                         ['request_id' => (string) $installationRequest->id, 'type' => 'new_installation_request']
                     );
                 } else {
                     \App\Models\Notification::create([
                        'recipient_id' => $admin->id,
                        'title' => 'طلب تركيب جديد 🔧',
                        'body' => "تم استلام طلب تركيب جديد #{$installationRequest->id} من {$request->user()->name}",
                        'type' => 'new_installation_request',
                        'data' => ['request_id' => (string) $installationRequest->id, 'type' => 'new_installation_request'],
                     ]);
                 }
            }

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
        $request = InstallationRequest::with(['user', 'technician', 'attachments', 'rating'])->findOrFail($id);
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
                $installationRequest->user->fcm_token ?? '',
                'تم قبول طلب التركيب 🛠️',
                "قام الفني بقبول طلب التركيب رقم #{$installationRequest->id} وهو في الطريق إليك.",
                ['type' => 'installation_request_update', 'request_id' => (string) $installationRequest->id]
            );
        }

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

                $this->notificationService->sendNotification(
                    $customer->fcm_token ?? '',
                    'تحديث حالة الطلب 🔔',
                    "تم تغيير حالة طلب التركيب #{$installationRequest->id} إلى: {$statusText}",
                    ['request_id' => (string) $installationRequest->id, 'type' => 'status_update']
                );
            }
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

        // Notify Technician
        $technician = \App\Models\User::find($request->technician_id);
        if ($technician && $technician->fcm_token) {
            $this->notificationService->sendNotification(
                $technician->fcm_token,
                'مهمة تركيب جديدة 🛠️',
                "تم تعيين طلب تركيب جديد لك: #{$installationRequest->id}\nالعنوان: {$installationRequest->address}\nالمنتج: {$installationRequest->product_type}",
                ['request_id' => (string) $installationRequest->id, 'type' => 'assignment']
            );
        }

        return response()->json([
            'success' => true,
            'message' => 'Technician assigned successfully',
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
}
