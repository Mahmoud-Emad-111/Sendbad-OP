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
                    'customers' => $totalCustomers
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
        $odooPartner = $odoo->findCustomerByPhone($user->phone);

        if ($odooPartner) {
            $orders = $odoo->getCustomerOrders($odooPartner['id']);
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
}
