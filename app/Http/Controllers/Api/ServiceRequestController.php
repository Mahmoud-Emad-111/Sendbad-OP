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

        // 1. Search (ID, User Name, User Phone)
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

        // 2. Filter by Status
        if ($request->filled('status') && $request->status !== 'all') {
            $query->where('status', $request->status);
        }

        // 3. Filter by Technician
        if ($request->filled('technician_id')) {
            $query->where('technician_id', $request->technician_id);
        }

        // 4. Filter by Service Type
        if ($request->filled('service_type') && $request->service_type !== 'all') {
            $query->where('service_type', $request->service_type);
        }

        // 5. Filter by Date Range
        if ($request->filled('date_from')) {
            $query->whereDate('scheduled_at', '>=', $request->date_from);
        }
        if ($request->filled('date_to')) {
            $query->whereDate('scheduled_at', '<=', $request->date_to);
        }

        $requests = $query->latest()->get();

        return response()->json([
            'success' => true,
            'data' => $requests
        ]);
        return response()->json([
            'success' => true,
            'data' => $requests
        ]);
    }

    /**
     * Show single request details
     */
    public function show(Request $request, $id)
    {
        $serviceRequest = \App\Models\ServiceRequest::with(['user', 'technician', 'attachments'])->findOrFail($id);

        // Security check: Customer can only see their own, Tech can only see assigned, Admin sees all
        $user = $request->user();
        if ($user->role === 'customer' && $serviceRequest->user_id !== $user->id) {
            return response()->json(['success' => false, 'message' => 'Unauthorized'], 403);
        }
        if ($user->role === 'technician' && $serviceRequest->technician_id !== $user->id) {
             return response()->json(['success' => false, 'message' => 'Unauthorized'], 403);
        }

        return response()->json([
            'success' => true,
            'data' => $serviceRequest
        ]);
    }

    /**
     * Create a new Service Request
     */
    public function store(Request $request)
    {
        \Illuminate\Support\Facades\Log::info('Request Data:', $request->all());

        $request->validate([
            'service_type' => 'required|string',
            'description' => 'required|string',
            'address' => 'required|string',
            'scheduled_at' => 'required|date',
            'images.*' => 'image|mimes:jpeg,png,jpg,gif|max:5120', // Increased to 5MB
        ]);

        try {
            DB::beginTransaction();

            $serviceRequest = \App\Models\ServiceRequest::create([
                'user_id' => $request->user()->id,
                'service_type' => $request->service_type,
                'description' => $request->description,
                'address' => $request->address,
                'scheduled_at' => $request->scheduled_at,
                'latitude' => $request->latitude ?? null,
                'longitude' => $request->longitude ?? null,
                'status' => 'pending',
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
                        $serviceRequest->attachments()->create([
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
            'technician_id' => 'required|exists:users,id',
            'task_start_time' => 'nullable|date',
            'task_end_time' => 'nullable|date|after_or_equal:task_start_time'
        ]);

        $serviceRequest = \App\Models\ServiceRequest::findOrFail($id);

        $serviceRequest->update([
            'technician_id' => $request->technician_id,
            'status' => 'assigned',
            'task_start_time' => $request->task_start_time,
            'task_end_time' => $request->task_end_time
        ]);

        // Notify Technician
        $technician = User::find($request->technician_id);
        if ($technician && $technician->fcm_token) {
            $this->notificationService->sendNotification(
                $technician->fcm_token,
                'مهمة جديدة 🛠️',
                "تم تعيين طلب صيانة جديد لك: #{$serviceRequest->id}\nالنوع: {$serviceRequest->service_type}\nتاريخ التسليم: " . ($request->task_end_time ?? 'غير محدد'),
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

        $data = ['status' => $request->status];

        // Set completed_at if status is changed to completed
        if ($request->status === 'completed' && $serviceRequest->status !== 'completed') {
            $data['completed_at'] = now();
        }

        $serviceRequest->update($data);

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

    /**
     * Rate a completed request (Customer Only)
     */
    public function rate(Request $request, $id)
    {
        $request->validate([
            'rating' => 'required|integer|min:1|max:5',
            'review_comment' => 'nullable|string'
        ]);

        $serviceRequest = \App\Models\ServiceRequest::findOrFail($id);

        // Ensure user is the owner
        if ($serviceRequest->user_id !== $request->user()->id) {
            return response()->json(['success' => false, 'message' => 'غير مصرح لك بتقييم هذا الطلب'], 403);
        }

        // Ensure request is completed
        if ($serviceRequest->status !== 'completed') {
            return response()->json(['success' => false, 'message' => 'يمكنك تقييم الطلبات المكتملة فقط'], 400);
        }

        $serviceRequest->update([
            'rating' => $request->rating,
            'review_comment' => $request->review_comment
        ]);

        return response()->json([
            'success' => true,
            'message' => 'تم إرسال تقييمك بنجاح، شكراً لك! ⭐',
            'data' => $serviceRequest
        ]);
    }
    /**
     * Check Eligibility for new Feature
     * (No Dues & Ready Task)
     */
    public function checkEligibility(Request $request, \App\Services\Odoo\OdooIntegrationInterface $odoo)
    {
        $user = $request->user();

        if (!$user->odoo_id) {
             return response()->json([
                'success' => false,
                'eligible' => false,
                'message' => 'User not linked to Odoo'
            ], 400);
        }

        // Debug: Get Partner Name to verify we have the right person
        $partnerInfo = $odoo->findCustomerByPhone($user->phone); // Or just read name by ID if we had a method
        $partnerName = $partnerInfo['name'] ?? 'Unknown';

        // 1. Check Financials (Must have 0 due)
        // Trying both Sales Orders AND Invoices to find where the debt is
        // We use PHONE and NAME search now as requested
        $nameForSearch = $partnerName !== 'Unknown' ? $partnerName : null;

        $orders = $odoo->getCustomerOrders($user->odoo_id, $user->phone, $nameForSearch);
        $invoices = $odoo->getCustomerInvoices($user->odoo_id, $user->phone);

        $dueFromOrders = collect($orders)->sum(function ($order) {
            return $order['amount_due']
                ?? $order['x_amount_due']
                ?? $order['amount_residual']
                ?? 0;
        });

        $dueFromInvoices = collect($invoices)->sum('amount_residual');

        // We take the MAX of both to be safe, or just invoices if orders are empty
        $totalDue = $dueFromOrders + $dueFromInvoices;

        if ($totalDue > 0) {
            return response()->json([
                'success' => true,
                'eligible' => false,
                'reason' => 'financial_due',
                'message' => 'عذراً، لديك مستحقات مالية معلقة. يرجى تسوية الحساب أولاً.',
                'amount_due' => $totalDue,
                'debug_info' => [
                    'odoo_id' => $user->odoo_id,
                    'orders_count' => count($orders),
                    'invoices_count' => count($invoices),
                    'due_orders' => $dueFromOrders,
                    'due_invoices' => $dueFromInvoices,
                    'raw_invoices' => $invoices
                ]
            ]);
        }

        // 2. Check Task Readiness
        $isReady = $odoo->checkTaskReadiness($user->odoo_id);
        $tasks = $odoo->getUserTasks($user->odoo_id);

        if (!$isReady) {
            return response()->json([
                'success' => true,
                'eligible' => false,
                'reason' => 'task_not_ready',
                'message' => 'عذراً، لم يتم استيفاء شروط المهمة المطلوبة (اكتمال المنتج) في النظام.',
                'amount_due' => $totalDue,
                'debug_info' => [
                    'tasks' => $tasks,
                    'is_ready' => $isReady
                ]
            ]);
        }

        return response()->json([
            'success' => true,
            'eligible' => true,
            'message' => 'أنت مؤهل لاستخدام هذه الميزة.',
            'amount_due' => $totalDue,
            'debug_info' => [
                'tasks' => $tasks,
                'is_ready' => $isReady,
                'odoo_id' => $user->odoo_id
            ]
        ]);
    }
}
