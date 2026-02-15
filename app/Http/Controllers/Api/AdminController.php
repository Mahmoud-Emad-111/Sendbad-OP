<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;
use App\Services\Odoo\OdooService;

class AdminController extends Controller
{
    protected $notificationService;

    public function __construct(\App\Services\NotificationService $notificationService)
    {
        $this->notificationService = $notificationService;
    }
    /**
     * List all users (with optional role filtering)
     */
    public function getUsers(Request $request)
    {
        $query = User::query();

        if ($request->has('role')) {
            $query->where('role', $request->role);
        }

        if ($request->has('search')) {
            $search = $request->search;
            $query->where(function($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('phone', 'like', "%{$search}%")
                  ->orWhere('email', 'like', "%{$search}%");
            });
        }

        $users = $query->latest()->get();

        return response()->json([
            'success' => true,
            'data' => $users
        ]);
    }
    /**
     * Create a new Customer Manually (with Odoo fields)
     */
    public function storeUser(Request $request)
    {
        $request->validate([
            'name' => 'required|string|max:255',
            'phone' => 'required|string|unique:users,phone',
            'orders' => 'nullable|array',
            'orders.*.invoice_number' => 'required|string',
            'orders.*.quotation_template' => 'nullable|string',
            'orders.*.total_amount' => 'required|numeric',
            'orders.*.paid_amount' => 'required|numeric',
            'orders.*.remaining_amount' => 'nullable|numeric',
            'orders.*.status' => 'required|string|in:paid,partial',
        ]);

        $user = User::create([
            'name' => $request->name,
            'phone' => $request->phone,
            // 'password' => \Illuminate\Support\Facades\Hash::make('12345678'), // Default password
            'role' => 'customer',
            'is_active' => true,
        ]);

        if ($request->has('orders')) {
            foreach ($request->orders as $orderData) {
                // Auto-calc remaining if not sent? Frontend sends it, but safe to calc?
                // Using frontend data for now.
                $user->manualOrders()->create($orderData);
            }
        }

        return response()->json([
            'success' => true,
            'message' => 'تم إضافة العميل بنجاح',
            'data' => $user->load('manualOrders')
        ]);
    }


    /**
     * Create a new Technician
     */
    public function createTechnician(Request $request)
    {
        $request->validate([
            'name' => 'required|string|max:255',
            'phone' => 'required|string|unique:users,phone',
            'password' => 'required|string|min:6',
        ]);

        $technician = User::create([
            'name' => $request->name,
            'phone' => $request->phone,
            'password' => \Illuminate\Support\Facades\Hash::make($request->password),
            'role' => 'technician',
            'is_active' => true
        ]);

        return response()->json([
            'success' => true,
            'message' => 'تم إضافة الفني بنجاح',
            'data' => $technician
        ]);
    }
    public function dashboardStats()
    {
        $totalRequests = \App\Models\ServiceRequest::count();
        $pendingRequests = \App\Models\ServiceRequest::where('status', 'pending')->count();
        $assignedRequests = \App\Models\ServiceRequest::where('status', 'assigned')->count();
        $completedRequests = \App\Models\ServiceRequest::where('status', 'completed')->count();

        $totalTechnicians = User::where('role', 'technician')->count();
        $totalCustomers = User::where('role', 'customer')->count();

        // Installation Requests Stats
        $totalInstallation = \App\Models\InstallationRequest::count();
        $pendingInstallation = \App\Models\InstallationRequest::where('status', 'pending')->count();
        $completedInstallation = \App\Models\InstallationRequest::where('status', 'completed')->count();

        $recentRequests = \App\Models\ServiceRequest::with(['user', 'technician'])
            ->latest()
            ->take(5)
            ->get();

        return response()->json([
            'success' => true,
            'data' => [
                'counts' => [
                    'total_requests' => $totalRequests,
                    'pending_requests' => $pendingRequests,
                    'assigned_requests' => $assignedRequests,
                    'completed_requests' => $completedRequests,
                    'technicians' => $totalTechnicians,
                    'customers' => $totalCustomers,
                    'total_installations' => $totalInstallation,
                    'pending_installations' => $pendingInstallation,
                    'completed_installations' => $completedInstallation
                ],
                'recent_requests' => $recentRequests
            ]
        ]);
    }
    public function getUserDetails(Request $request, $id, \App\Services\Odoo\OdooService $odoo)
    {
        if ($request->user()->role !== 'admin') {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $user = User::with(['serviceRequests' => function($q) {
            $q->latest();
        }, 'assignedServiceRequests' => function($q) {
            $q->with('user')->latest();
        }, 'assignedInstallationRequests' => function($q) {
            $q->with('user')->latest();
        }])->findOrFail($id);

        $odooData = [];
        $odooPartner = $odoo->findCustomerByPhoneOrName($user->phone, $user->name);

        if ($odooPartner) {
            // Pass both phone and name to ensure we find orders
            $orders = $odoo->getCustomerOrders($odooPartner['id'], $user->phone, $user->name);
            $odooData = [
                'partner_id' => $odooPartner['id'],
                'orders' => $orders
            ];
        }

        return response()->json([
            'success' => true,
            'data' => [
                'user' => $user,
                'odoo' => $odooData
            ]
        ]);
    }

    /**
     * Lookup user by phone and fetch Odoo data for Admin request creation
     */
    public function lookupUserByPhone(Request $request, OdooService $odoo, $phone)
    {
        if ($request->user()->role !== 'admin') {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        // 1. Find user by phone in database
        $user = User::where('phone', $phone)->first();

        // 2. Try to find in Odoo
        // searching by phone only, name is null
        $odooPartner = $odoo->findCustomerByPhoneOrName($phone, null);

        $odooData = [
            'linked' => false,
            'orders' => []
        ];

        // 3. Process Odoo Data if found
        if ($odooPartner) {
            $nameForOrders = $user ? $user->name : $odooPartner['name'];
            $orders = $odoo->getCustomerOrders($odooPartner['id'], $phone, $nameForOrders);

            $odooData = [
                'linked' => true,
                'partner_id' => $odooPartner['id'],
                'orders' => array_map(function($o) {
                    return [
                        'id' => $o['id'],
                        'name' => $o['name'], // invoice_number
                        'quotation_template' => is_array($o['sale_order_template_id'])
                            ? $o['sale_order_template_id'][1]
                            : null,
                        'date' => $o['date_order']
                    ];
                }, $orders)
            ];
        }

        // Case 1: User Not found locally AND Not found in Odoo
        if (!$user && !$odooPartner) {
            return response()->json([
                'success' => false,
                'message' => 'User not found in database or Odoo'
            ], 404);
        }

        // Mock Order Data if Local User has manual orders
        $manualOrders = $user ? $user->manualOrders : collect([]);

        if ($manualOrders->isNotEmpty() && empty($odooData['orders'])) {
             // Treat this local user as having "Linked Orders"
             $odooData['linked'] = true;
             $odooData['partner_id'] = 'manual_' . $user->id; // Fake ID
             $odooData['orders'] = $manualOrders->map(function ($order) {
                 return [
                     'id' => 'manual_' . $order->id,
                     'name' => $order->invoice_number,
                     'quotation_template' => $order->quotation_template,
                     'date' => $order->created_at->format('Y-m-d H:i:s'),
                     'amount_total' => $order->total_amount,
                     'amount_residual' => $order->remaining_amount,
                     'is_manual' => true
                 ];
             })->toArray();
        } elseif ($user && $user->invoice_number && empty($odooData['orders'])) {
             // Fallback for previous single version (if any exist)
             $odooData['linked'] = true;
             $odooData['partner_id'] = 'manual_' . $user->id;
             $odooData['orders'][] = [
                 'id' => 'manual_' . $user->invoice_number,
                 'name' => $user->invoice_number,
                 'quotation_template' => $user->quotation_template,
                 'date' => $user->created_at->format('Y-m-d H:i:s'),
                 'is_manual' => true
             ];
        }

        // Case 2: User Not found locally BUT Found in Odoo -> Prepare "Virtual" User
        if (!$user && $odooPartner) {
            $user = [
                'id' => null, // Validates that accurate user creation is needed
                'name' => $odooPartner['name'], // Taking name from Odoo
                'phone' => $phone,
                'email' => $odooPartner['email'] ?? null,
                'address' => $odooPartner['street'] ?? null, // Taking address from Odoo
                'role' => 'customer',
                'is_odoo_only' => true
            ];
        }

        return response()->json([
            'success' => true,
            'data' => [
                'user' => $user,
                'odoo' => $odooData
            ]
        ]);
    }

    /**
     * Create service request on behalf of a user (Admin only)
     */
    public function createServiceRequest(Request $request)
    {
        if ($request->user()->role !== 'admin') {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $validated = $request->validate([
            'user_id' => 'nullable|exists:users,id',
            'new_user_name' => 'required_without:user_id|string',
            'new_user_phone' => 'required_without:user_id|string',
            'service_type' => 'required|string|in:maintenance,repair,inspection',
            'description' => 'required|string',
            'address' => 'nullable|string',
            'scheduled_at' => 'required|date',
            'end_date' => 'required|date|after_or_equal:scheduled_at',
            'invoice_number' => 'nullable|string',
            'latitude' => 'nullable|numeric',
            'longitude' => 'nullable|numeric',
            'images.*' => 'image|mimes:jpeg,png,jpg,gif|max:5120',
        ]);

        $userId = $validated['user_id'] ?? null;

        // If user_id is null, create the user
        if (!$userId) {
            $user = User::firstOrCreate(
                ['phone' => $validated['new_user_phone']],
                [
                    'name' => $validated['new_user_name'],
                    'password' => \Illuminate\Support\Facades\Hash::make('12345678'), // Default password
                    'role' => 'customer',
                    'is_active' => true
                ]
            );
            $userId = $user->id;
        }

        $serviceRequest = \App\Models\ServiceRequest::create([
            'user_id' => $userId,
            'service_type' => $validated['service_type'],
            'description' => $validated['description'],
            'address' => $validated['address'] ?? '',
            'scheduled_at' => $validated['scheduled_at'],
            'end_date' => $validated['end_date'] ?? $validated['scheduled_at'], // Default to same day if not provided
            'invoice_number' => isset($validated['invoice_number']) ? 'T-' . $validated['invoice_number'] : null,
            'latitude' => $validated['latitude'] ?? null,
            'longitude' => $validated['longitude'] ?? null,
            'status' => 'pending',
        ]);

        // Handle image attachments
        if ($request->hasFile('images')) {
            foreach ($request->file('images') as $image) {
                $path = $image->store('request_attachments', 'public');
                \App\Models\RequestAttachment::create([
                    'request_id' => $serviceRequest->id,
                    'file_path' => $path
                ]);
            }
        }

        return response()->json([
            'success' => true,
            'message' => 'Service request created successfully',
            'data' => $serviceRequest->load(['user', 'attachments'])
        ], 201);
    }

    /**
     * Create installation request on behalf of a user (Admin only)
     */
    public function createInstallationRequest(Request $request)
    {
        if ($request->user()->role !== 'admin') {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $validated = $request->validate([
            'user_id' => 'nullable|exists:users,id',
            'new_user_name' => 'required_without:user_id|string',
            'new_user_phone' => 'required_without:user_id|string',
            'invoice_number' => 'nullable|string',
            'product_type' => 'required|string',
            'quantity' => 'nullable|integer|min:1',
            'is_site_ready' => 'required|boolean',
            'readiness_details' => 'nullable|json',
            'notes' => 'nullable|string',
            'address' => 'nullable|string',
            'scheduled_at' => 'required|date',
            'end_date' => 'required|date|after_or_equal:scheduled_at',
            'latitude' => 'nullable|numeric',
            'longitude' => 'nullable|numeric',
            'images.*' => 'image|mimes:jpeg,png,jpg,gif|max:5120',
        ]);

        $userId = $validated['user_id'] ?? null;

        // If user_id is null, create the user
        if (!$userId) {
            $user = User::firstOrCreate(
                ['phone' => $validated['new_user_phone']],
                [
                    'name' => $validated['new_user_name'],
                    'password' => \Illuminate\Support\Facades\Hash::make('12345678'), // Default password
                    'role' => 'customer',
                    'is_active' => true
                ]
            );
            $userId = $user->id;
        }

        $installationRequest = \App\Models\InstallationRequest::create([
            'user_id' => $userId,
            'invoice_number' => isset($validated['invoice_number']) ? 'B-' . $validated['invoice_number'] : null,
            'product_type' => $validated['product_type'],
            'quantity' => $validated['quantity'] ?? 1,
            'is_site_ready' => $validated['is_site_ready'],
            'readiness_details' => $validated['readiness_details'] ? json_decode($validated['readiness_details'], true) : null,
            'notes' => $validated['notes'] ?? null,
            'address' => $validated['address'] ?? '',
            'scheduled_at' => $validated['scheduled_at'],
            'latitude' => $validated['latitude'] ?? null,
            'longitude' => $validated['longitude'] ?? null,
            'status' => 'pending',
        ]);

        // Handle image attachments
        if ($request->hasFile('images')) {
            foreach ($request->file('images') as $image) {
                $path = $image->store('installation_attachments', 'public');
                \App\Models\RequestAttachment::create([
                    'attachable_id' => $installationRequest->id,
                    'attachable_type' => \App\Models\InstallationRequest::class,
                    'file_path' => $path
                ]);
            }
        }

        return response()->json([
            'success' => true,
            'message' => 'Installation request created successfully',
            'data' => $installationRequest->load(['user', 'attachments'])
        ], 201);
    }

    public function getPerformanceReports()
    {
        // 1. Top Technicians by Rating (Service + Installation)
        $technicians = User::where('role', 'technician')
            ->with(['assignedServiceRequests.rating', 'assignedInstallationRequests.rating'])
            ->get()
            ->map(function ($tech) {
                // Collect all service ratings
                $serviceRatings = $tech->assignedServiceRequests->pluck('rating.service_rating')->filter();
                $installRatings = $tech->assignedInstallationRequests->pluck('rating.service_rating')->filter();
                $allRatings = $serviceRatings->merge($installRatings);

                $avg = $allRatings->avg() ?? 0;
                $count = $tech->assignedServiceRequests->where('status', 'completed')->count()
                       + $tech->assignedInstallationRequests->where('status', 'completed')->count();

                return [
                    'id' => $tech->id,
                    'name' => $tech->name,
                    'avg_rating' => round($avg, 1),
                    'completed_count' => $count
                ];
            })
            ->sortByDesc('avg_rating')
            ->values() // Re-index
            ->take(5);

        // 2. Average Completion Time (in hours) - Service
        $serviceStats = \App\Models\ServiceRequest::whereNotNull('completed_at')
            ->selectRaw('AVG(TIMESTAMPDIFF(HOUR, created_at, completed_at)) as avg_hours, COUNT(*) as count')
            ->first();

        // 2. Average Completion Time (in hours) - Installation
        $installStats = \App\Models\InstallationRequest::whereNotNull('completed_at')
            ->selectRaw('AVG(TIMESTAMPDIFF(HOUR, created_at, completed_at)) as avg_hours, COUNT(*) as count')
            ->first();

        // Weighted Average
        $totalCount = ($serviceStats->count ?? 0) + ($installStats->count ?? 0);
        $weightedAvg = 0;
        if ($totalCount > 0) {
            $weightedAvg = (
                (($serviceStats->avg_hours ?? 0) * ($serviceStats->count ?? 0)) +
                (($installStats->avg_hours ?? 0) * ($installStats->count ?? 0))
            ) / $totalCount;
        }

        // 3. Ratings Breakdown (All Service Ratings)
        $ratingsBreakdown = \App\Models\Rating::selectRaw('service_rating as rating, count(*) as count')
            ->whereNotNull('service_rating')
            ->groupBy('service_rating')
            ->orderByDesc('service_rating')
            ->get();

        // 4. Top Customers (By Spending - Manual Orders)
        $topCustomers = \App\Models\User::where('role', 'customer')
            ->join('manual_orders', 'users.id', '=', 'manual_orders.user_id')
            ->selectRaw('users.id, users.name, users.phone, count(manual_orders.id) as orders_count, sum(manual_orders.total_amount) as total_spent, sum(manual_orders.paid_amount) as total_paid')
            ->groupBy('users.id', 'users.name', 'users.phone')
            ->orderByDesc('total_spent')
            ->take(5)
            ->get();

        // 5. Recent Financial Transactions (Last 10 Manual Orders)
        $recentTransactions = \App\Models\ManualOrder::with('user:id,name')
            ->latest()
            ->take(10)
            ->get();

        return response()->json([
            'success' => true,
            'data' => [
                'top_technicians' => $technicians,
                'avg_completion_hours' => round($weightedAvg, 1),
                'ratings_breakdown' => $ratingsBreakdown,
                'top_customers' => $topCustomers,
                'recent_transactions' => $recentTransactions
            ]
        ]);
    }

    /**
     * Get Available Technicians (Filtered by Date)
     */
    public function getAvailableTechnicians(Request $request)
    {
        $startDate = $request->input('start_date');
        $endDate = $request->input('end_date');

        if (!$startDate) {
            return response()->json(['success' => false, 'message' => 'Start date is required'], 400);
        }

        if (!$endDate) {
            $endDate = $startDate;
        }

        // 1. Get All Technicians
        $technicians = \App\Models\User::where('role', 'technician')->get();

        // 2. Filter out busy technicians
        $availableTechnicians = $technicians->filter(function ($tech) use ($startDate, $endDate) {
            // Check Service Requests
            $busyService = \App\Models\ServiceRequest::where('technician_id', $tech->id)
                ->whereIn('status', ['assigned', 'on_way', 'in_progress'])
                ->where(function ($q) use ($startDate, $endDate) {
                    $q->whereBetween('scheduled_at', [$startDate, $endDate])
                      ->orWhereBetween('end_date', [$startDate, $endDate])
                      ->orWhere(function ($sub) use ($startDate, $endDate) {
                          $sub->where('scheduled_at', '<=', $startDate)
                              ->where('end_date', '>=', $endDate);
                      });
                })
                ->exists();

            if ($busyService) return false;

            // Check Installation Requests
            $busyInstallation = \App\Models\InstallationRequest::where('technician_id', $tech->id)
                ->whereIn('status', ['assigned', 'on_way', 'in_progress'])
                ->where(function ($q) use ($startDate, $endDate) {
                    $q->whereBetween('scheduled_at', [$startDate, $endDate])
                      ->orWhereBetween('end_date', [$startDate, $endDate])
                      ->orWhere(function ($sub) use ($startDate, $endDate) {
                          $sub->where('scheduled_at', '<=', $startDate)
                              ->where('end_date', '>=', $endDate);
                      });
                })
                ->exists();

            return !$busyInstallation;
        });

        return response()->json([
            'success' => true,
            'data' => $availableTechnicians->values()
        ]);
    }
    /**
     * Delete User (Admin Only)
     */
    public function deleteUser(Request $request, $id)
    {
        if ($request->user()->role !== 'admin') {
            return response()->json(['success' => false, 'message' => 'Unauthorized'], 403);
        }

        $user = User::findOrFail($id);

        if ($user->id === $request->user()->id) {
            return response()->json(['success' => false, 'message' => 'Cannot delete your own account'], 400);
        }

        $user->delete();

        return response()->json([
            'success' => true,
            'message' => 'User deleted successfully'
        ]);
    }

    /**
     * Update User Details (Admin Only)
     */
    public function updateUser(Request $request, $id)
    {
        if ($request->user()->role !== 'admin') {
            return response()->json(['success' => false, 'message' => 'Unauthorized'], 403);
        }

        $user = User::findOrFail($id);

        $validated = $request->validate([
            'name' => 'sometimes|string|max:255',
            'phone' => 'sometimes|string|unique:users,phone,' . $user->id,
            'role' => 'sometimes|in:admin,technician,customer',
            'is_active' => 'sometimes|boolean',
            'profile_link' => 'nullable|url'
        ]);

        $user->update($validated);

        return response()->json([
            'success' => true,
            'message' => 'User updated successfully',
            'data' => $user
        ]);
    }

    /**
     * Bulk delete users
     */
    public function bulkDeleteUsers(Request $request)
    {
        if ($request->user()->role !== 'admin') {
            return response()->json(['success' => false, 'message' => 'Unauthorized'], 403);
        }

        $request->validate([
            'ids' => 'required|array',
            'ids.*' => 'exists:users,id'
        ]);

        try {
            $ids = $request->ids;
            $currentUserId = $request->user()->id;

            // Remove current user from deletion list
            $ids = array_filter($ids, function($id) use ($currentUserId) {
                return $id != $currentUserId;
            });

            if (empty($ids)) {
                return response()->json([
                    'success' => false,
                    'message' => 'Cannot delete your own account'
                ], 403);
            }

            // Soft delete users
            $deletedCount = User::whereIn('id', $ids)->delete();

            return response()->json([
                'success' => true,
                'message' => "$deletedCount user(s) deleted successfully",
                'deleted_count' => $deletedCount
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error deleting users: ' . $e->getMessage()
            ], 500);
        }
    }
    /**
     * Get Daily Completed Requests for Reports
     */
    public function getDailyCompletedRequests(Request $request)
    {
        $request->validate([
            'date' => 'required|date'
        ]);

        $date = $request->date;

        // Maintenance (Service Requests)
        $maintenance = \App\Models\ServiceRequest::with(['user', 'technician'])
            ->where('status', 'completed')
            ->whereDate('completed_at', $date)
            ->get()
            ->map(function ($req) {
                return [
                    'id' => $req->id,
                    'type' => 'maintenance',
                    'service_type' => $req->service_type,
                    'completed_at' => $req->completed_at,
                    'technician_name' => $req->technician ? $req->technician->name : 'N/A',
                    'customer_name' => $req->user ? $req->user->name : 'N/A',
                    'rating' => $req->rating,
                    'invoice_number' => $req->invoice_number
                ];

});

        // Installation Requests
        $installation = \App\Models\InstallationRequest::with(['user', 'technician'])
            ->where('status', 'completed')
            ->whereDate('completed_at', $date)
            ->get()
            ->map(function ($req) {
                return [
                    'id' => $req->id,
                    'type' => 'installation',
                    'product_type' => $req->product_type,
                    'completed_at' => $req->completed_at,
                    'technician_name' => $req->technician ? $req->technician->name : 'N/A',
                    'customer_name' => $req->user ? $req->user->name : 'N/A',
                    'rating' => $req->rating, // Ensure relation exists or adjust
                     'invoice_number' => $req->invoice_number
                ];
            });

        $all = $maintenance->merge($installation)->sortByDesc('completed_at')->values();

        return response()->json([
            'success' => true,
            'data' => $all
        ]);
    }


    /**
     * Send Custom Notification
     */
    public function sendCustomNotification(Request $request)
    {
        $request->validate([
            'recipient_type' => 'required|in:all_users,all_technicians,specific_user',
            'user_id' => 'required_if:recipient_type,specific_user|exists:users,id',
            'title' => 'required|string|max:255',
            'body' => 'required|string',
        ]);

        $users = collect();

        if ($request->recipient_type === 'all_users') {
            $users = \App\Models\User::where('role', 'customer')->whereNotNull('fcm_token')->get();
        } elseif ($request->recipient_type === 'all_technicians') {
            $users = \App\Models\User::where('role', 'technician')->whereNotNull('fcm_token')->get();
        } elseif ($request->recipient_type === 'specific_user') {
            $user = \App\Models\User::find($request->user_id);
            if ($user && $user->fcm_token) {
                $users->push($user);
            }
        }

        $count = 0;
        foreach ($users as $user) {
            $this->notificationService->sendNotification(
                $user->fcm_token,
                $request->title,
                $request->body,
                ['type' => 'custom_notification']
            );
            $count++;
        }

        return response()->json([
            'success' => true,
            'message' => "Notification sent to {$count} users successfully",
            'sent_count' => $count
        ]);
    }

    /**
     * Get All Ratings for Reports
     */
    public function getRatings(Request $request)
    {
        $ratings = \App\Models\Rating::with(['user', 'request'])
            ->latest()
            ->take(20) // Limit to latest 20 for the report dashboard
            ->get()
            ->map(function ($rating) {
                return [
                    'id' => $rating->id,
                    'user_name' => $rating->user->name ?? 'Unknown',
                    'rating' => ($rating->product_rating + $rating->service_rating) / 2,
                    'comment' => $rating->customer_notes,
                    'image_url' => $rating->image_url,
                    'created_at' => $rating->created_at->diffForHumans(),
                    'request_id' => $rating->request_id,
                    'request_type' => $rating->request_type,
                ];
            });

        return response()->json([
            'success' => true,
            'data' => $ratings
        ]);
    }
}
