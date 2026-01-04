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
}
