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
    protected $odooService;

    public function __construct(
        \App\Services\NotificationService $notificationService,
        \App\Services\Odoo\OdooService $odooService
    ) {
        $this->notificationService = $notificationService;
        $this->odooService = $odooService;
    }

    /**
     * Get Customer Orders (For selecting product to maintain)
     */
    public function getMyOrders(Request $request)
    {
        $user = $request->user();

        // 1. Find Odoo ID
        $partner = $this->odooService->findCustomerByPhoneOrName($user->phone, $user->name);

        if (!$partner) {
            return response()->json([
                'success' => true,
                'message' => 'No linked Odoo account found',
                'data' => []
            ]);
        }

        // 2. Fetch Orders
        $orders = $this->odooService->getCustomerOrders($partner['id'], $user->phone, $user->name);

        // 3. Format for Mobile
        $formattedOrders = array_map(function ($order) {
            return [
                'id' => $order['id'],
                // Using Sale Order Ref as 'Invoice Number' as it's the primary reference for the customer
                'invoice_number' => $order['name'],
                'date' => $order['date_order'],
                'quotation_template' => is_array($order['sale_order_template_id'])
                    ? $order['sale_order_template_id'][1]
                    : null,
                'total' => $order['amount_total']
            ];
        }, $orders);

        return response()->json([
            'success' => true,
            'data' => $formattedOrders
        ]);
    }

    /**
     * Technician accepts a service request
     */
    public function acceptRequest(\App\Http\Requests\AcceptServiceRequest $request)
    {
        // Validation handled by FormRequest (Role, Existence, Ownership, Not Accepted)

        $serviceRequest = ServiceRequest::find($request->id);

        $serviceRequest->status = 'on_way';
        $serviceRequest->technician_accepted_at = now();
        $serviceRequest->save();

        // Notify customer
        $this->notificationService->sendNotification(
            $serviceRequest->user,
            'Service Request Accepted',
            "Your service request #{$serviceRequest->id} has been accepted by the technician and they are on their way.",
            ['type' => 'service_request_update', 'request_id' => $serviceRequest->id]
        );

        return response()->json([
            'success' => true,
            'message' => 'Service request accepted and status updated to "on_way".',
            'data' => $serviceRequest
        ]);
    }

    /**
     * Get Technician Schedule (Assigned Requests)
     */
    public function getMySchedule(Request $request)
    {
        $user = $request->user();

        if ($user->role !== 'technician') {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        // Fetch Assigned Service Requests
        $serviceRequests = \App\Models\ServiceRequest::where('technician_id', $user->id)
            ->whereIn('status', ['assigned', 'on_way', 'in_progress'])
            ->get()
            ->map(function ($req) {
                return [
                    'id' => $req->id,
                    'type' => 'service',
                    'service_type' => $req->service_type,
                    'invoice_number' => $req->invoice_number,
                    'start_date' => $req->scheduled_at->format('Y-m-d'),
                    'end_date' => $req->end_date ? $req->end_date->format('Y-m-d') : $req->scheduled_at->format('Y-m-d'),
                    'status' => $req->status,
                    'technician_accepted_at' => $req->technician_accepted_at,
                    'address' => $req->address,
                    'latitude' => $req->latitude,
                    'longitude' => $req->longitude,
                    'description' => $req->description,
                ];
            });

        // Fetch Assigned Installation Requests
        $installationRequests = \App\Models\InstallationRequest::where('technician_id', $user->id)
            ->whereIn('status', ['assigned', 'on_way', 'in_progress'])
            ->get()
            ->map(function ($req) {
                return [
                    'id' => $req->id,
                    'type' => 'installation',
                    'product_type' => $req->product_type,
                    'invoice_number' => $req->invoice_number,
                    'start_date' => $req->scheduled_at->format('Y-m-d'),
                    'end_date' => $req->end_date ? $req->end_date->format('Y-m-d') : $req->scheduled_at->format('Y-m-d'),
                    'status' => $req->status,
                    'technician_accepted_at' => $req->technician_accepted_at,
                    'address' => $req->address,
                    'latitude' => $req->latitude,
                    'longitude' => $req->longitude,
                    'quantity' => $req->quantity,
                ];
            });

        $schedule = $serviceRequests->merge($installationRequests)->sortBy('start_date')->values();

        return response()->json([
            'success' => true,
            'data' => $schedule
        ]);
    }

    /**
     * List requests (Admin sees all, Customer sees theirs)
     */
    public function index(Request $request)
    {
        $user = $request->user();
        $query = \App\Models\ServiceRequest::with(['user', 'technician', 'attachments', 'rating']);

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
        $serviceRequest = \App\Models\ServiceRequest::with(['user', 'technician', 'attachments', 'rating'])->findOrFail($id);

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
    public function store(\App\Http\Requests\StoreServiceRequest $request)
    {
        \Illuminate\Support\Facades\Log::info('Request Data:', $request->validated());

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
                'invoice_number' => 'T-' . $request->invoice_number,
                'end_date' => $request->end_date ?? $request->scheduled_at,
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
        $partnerInfo = $odoo->findCustomerByPhoneOrName($user->phone, $user->name); // Updated to use correct method name
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

    /**
     * Submit/Update Rating for a Request
     * Used for both ServiceRequest and InstallationRequest
     */
    public function submitRating(\App\Http\Requests\RatingRequest $request, $id)
    {
        $user = $request->user();

        // Determine request type from route
        $requestType = $request->route()->getName() === 'installation_requests.rating' ? 'installation' : 'service';

        // Find the request and verify ownership
        if ($requestType === 'service') {
            $serviceRequest = \App\Models\ServiceRequest::findOrFail($id);
            if ($serviceRequest->user_id !== $user->id) {
                return response()->json(['success' => false, 'message' => 'Unauthorized'], 403);
            }
        } else {
            $installationRequest = \App\Models\InstallationRequest::findOrFail($id);
            if ($installationRequest->user_id !== $user->id) {
                return response()->json(['success' => false, 'message' => 'Unauthorized'], 403);
            }
        }

        // Create or update rating
        $rating = \App\Models\Rating::updateOrCreate(
            [
                'request_id' => $id,
                'request_type' => $requestType,
            ],
            [
                'user_id' => $user->id,
                'product_rating' => $request->product_rating,
                'service_rating' => $request->service_rating,
                'how_found_us' => $request->how_found_us,
                'customer_notes' => $request->customer_notes,
            ]
        );

        return response()->json([
            'success' => true,
            'message' => 'Rating submitted successfully',
            'data' => $rating
        ]);
    }

    /**
     * Delete Service Request (Admin Only)
     */
    public function destroy(Request $request, $id)
    {
        if ($request->user()->role !== 'admin') {
            return response()->json(['success' => false, 'message' => 'Unauthorized'], 403);
        }

        $serviceRequest = \App\Models\ServiceRequest::findOrFail($id);
        $serviceRequest->delete();

        return response()->json([
            'success' => true,
            'message' => 'Service request deleted successfully'
        ]);
    }
}
