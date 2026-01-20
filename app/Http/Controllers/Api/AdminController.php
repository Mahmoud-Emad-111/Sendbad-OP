<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;

class AdminController extends Controller
{
    /**
     * List all users (with optional role filtering)
     */
    public function getUsers(Request $request)
    {
        $query = User::query();

        if ($request->has('role')) {
            $query->where('role', $request->role);
        }

        $users = $query->latest()->get();

        return response()->json([
            'success' => true,
            'data' => $users
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
        }, 'assignedRequests' => function($q) {
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
    public function lookupUserByPhone(Request $request, $phone, \App\Services\Odoo\OdooService $odoo)
    {
        if ($request->user()->role !== 'admin') {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        // 1. Find user by phone in database
        $user = User::where('phone', $phone)->first();

        if (!$user) {
            return response()->json([
                'success' => false,
                'message' => 'User not found in database'
            ], 404);
        }

        // 2. Fetch Odoo data
        $odooPartner = $odoo->findCustomerByPhoneOrName($user->phone, $user->name);
        $odooData = [
            'linked' => false,
            'orders' => []
        ];

        if ($odooPartner) {
            $orders = $odoo->getCustomerOrders($odooPartner['id'], $user->phone, $user->name);
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
            'user_id' => 'required|exists:users,id',
            'service_type' => 'required|string|in:maintenance,repair,inspection',
            'description' => 'required|string',
            'address' => 'nullable|string',
            'description' => 'required|string',
            'address' => 'nullable|string',
            'scheduled_at' => 'required|date',
            'end_date' => 'required|date|after_or_equal:scheduled_at',
            'invoice_number' => 'nullable|string',
            'latitude' => 'nullable|numeric',
            'longitude' => 'nullable|numeric',
            'images.*' => 'image|mimes:jpeg,png,jpg,gif|max:5120',
        ]);

        $serviceRequest = \App\Models\ServiceRequest::create([
            'user_id' => $validated['user_id'],
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
            'user_id' => 'required|exists:users,id',
            'invoice_number' => 'nullable|string',
            'product_type' => 'required|string',
            'quantity' => 'nullable|integer|min:1',
            'is_site_ready' => 'required|boolean',
            'readiness_details' => 'nullable|json',
            'readiness_details' => 'nullable|json',
            'notes' => 'nullable|string',
            'address' => 'nullable|string',
            'scheduled_at' => 'required|date',
            'end_date' => 'required|date|after_or_equal:scheduled_at',
            'latitude' => 'nullable|numeric',
            'longitude' => 'nullable|numeric',
            'images.*' => 'image|mimes:jpeg,png,jpg,gif|max:5120',
        ]);

        $installationRequest = \App\Models\InstallationRequest::create([
            'user_id' => $validated['user_id'],
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
        // 1. Top Technicians by Rating
        $topTechnicians = User::where('role', 'technician')
            ->whereHas('assignedRequests', function($q) {
                $q->whereNotNull('rating');
            })
            ->withAvg('assignedRequests as avg_rating', 'rating')
            ->withCount(['assignedRequests as completed_count' => function($q) {
                $q->where('status', 'completed');
            }])
            ->orderByDesc('avg_rating')
            ->take(5)
            ->get();

        // 2. Average Completion Time (in hours)
        $completionStats = \App\Models\ServiceRequest::whereNotNull('completed_at')
            ->selectRaw('AVG(TIMESTAMPDIFF(HOUR, created_at, completed_at)) as avg_hours_to_complete')
            ->first();

        // 3. Ratings Breakdown
        $ratingsBreakdown = \App\Models\ServiceRequest::whereNotNull('rating')
            ->selectRaw('rating, count(*) as count')
            ->groupBy('rating')
            ->orderByDesc('rating')
            ->get();

        return response()->json([
            'success' => true,
            'data' => [
                'top_technicians' => $topTechnicians,
                'avg_completion_hours' => round($completionStats->avg_hours_to_complete ?? 0, 1),
                'ratings_breakdown' => $ratingsBreakdown
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
}
