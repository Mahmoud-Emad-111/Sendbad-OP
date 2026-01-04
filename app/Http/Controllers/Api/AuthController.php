<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\Auth\AuthService;
use Illuminate\Http\Request;
use Exception;

class AuthController extends Controller
{
    protected AuthService $authService;

    public function __construct(AuthService $authService)
    {
        $this->authService = $authService;
    }

    /**
     * Step 1: Validate User via Odoo
     * POST /api/auth/validate-phone
     */
    public function validatePhone(Request $request)
    {
        $request->validate([
            'phone' => 'required|string',
        ]);

        try {
            $customer = $this->authService->validateOdooUser($request->phone);

            return response()->json([
                'success' => true,
                'message' => 'User found in Odoo.',
                'data' => [
                    'name' => $customer['name'],
                    'phone' => $customer['phone'],
                    'odoo_id' => $customer['id']
                ]
            ]);

        } catch (Exception $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage()
            ], 422);
        }
    }

    /**
     * Step 2: Activate Account & Set Password
     * POST /api/auth/activate
     */
    public function activate(Request $request)
    {
        $request->validate([
            'phone' => 'required|string',
            'password' => 'required|string|min:6|confirmed',
            'odoo_id' => 'required|integer',
            'name' => 'required|string', // Confirm name from Step 1
        ]);

        try {
            // Verify Logic again (optional but recommended for security) or trust the params
            // For now, we trust the flow, but AuthService handles duplicate checks.

            $token = $this->authService->activateUser(
                $request->phone,
                $request->password,
                $request->odoo_id,
                $request->name
            );

            return response()->json([
                'success' => true,
                'message' => 'Account activated successfully.',
                'token' => $token,
                'user' => [
                    'name' => $request->name,
                    'phone' => $request->phone,
                    'is_active' => true
                ]
            ]);

        } catch (Exception $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage()
            ], 422);
        }
    }

    /**
     * Step 3: Standard Login
     * POST /api/auth/login
     */
    public function login(Request $request)
    {
        $request->validate([
            'phone' => 'required|string',
            'password' => 'required|string',
        ]);

        if (!auth()->attempt($request->only('phone', 'password'))) {
            return response()->json([
                'success' => false,
                'message' => 'بيانات الدخول غير صحيحة'
            ], 401);
        }

        $user = auth()->user();

        if (!$user->is_active) {
            return response()->json([
                'success' => false,
                'message' => 'الحساب غير مفعل'
            ], 403);
        }

        $token = $user->createToken('auth_token')->plainTextToken;

        return response()->json([
            'success' => true,
            'message' => 'تم تسجيل الدخول بنجاح',
            'token' => $token,
            'user' => $user
        ]);
    }

    /**
     * Get Current User Profile
     * GET /api/auth/profile
     */
    public function profile(Request $request, \App\Services\Odoo\OdooIntegrationInterface $odoo)
    {
        $user = $request->user();
        $financials = $odoo->getCustomerOrders($user->odoo_id);

        // Calculate totals if needed, or just return the list
        // The user asked for "amount_total" and "amount_due".
        // Odoo returns a list of orders. We can sum them up or return the list.
        // Let's return the list and a calculated summary.

        $totalAmount = collect($financials)->sum('amount_total');
        $totalDue = collect($financials)->sum('amount_due');

        return response()->json([
            'success' => true,
            'message' => 'بيانات المستخدم',
            'data' => [
                'user' => $user,
                'financials' => [
                    'orders' => $financials,
                    'summary' => [
                        'total_amount' => $totalAmount,
                        'total_due' => $totalDue
                    ]
                ]
            ]
        ]);
    }
    /**
     * Update Current User Profile
     * POST /api/auth/update-profile
     */
    public function updateProfile(Request $request)
    {
        $user = $request->user();

        $request->validate([
            'name' => 'required|string|max:255',
            'phone' => 'required|string|unique:users,phone,' . $user->id,
            'password' => 'nullable|string|min:6|confirmed',
        ]);

        $user->name = $request->name;
        $user->phone = $request->phone;

        if ($request->filled('password')) {
            $user->password = \Illuminate\Support\Facades\Hash::make($request->password);
        }

        $user->save();

        return response()->json([
            'success' => true,
            'message' => 'تم تحديث البيانات بنجاح',
            'data' => $user
        ]);
    }
}
