<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\Auth\AuthService;
use App\Services\WhatsApp\HyperSenderService;
use Illuminate\Http\Request;
use Exception;

class AuthController extends Controller
{
    protected AuthService $authService;
    protected HyperSenderService $hyperSender;

    public function __construct(AuthService $authService, HyperSenderService $hyperSender)
    {
        $this->authService = $authService;
        $this->hyperSender = $hyperSender;
    }

    /**
     * Test OTP Sending (Dev Only)
     * POST /api/auth/test-otp
     */
    public function testOtp(Request $request)
    {
        $request->validate(['phone' => 'required|string']);

        $response = $this->hyperSender->sendOtp($request->phone);

        return response()->json([
            'success' => !!$response,
            'response' => $response
        ]);
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

            // Send OTP via WhatsApp
            $otpResponse = $this->hyperSender->sendOtp($request->phone);

            // Cache data for activation step (expires in 10 minutes)
            \Illuminate\Support\Facades\Cache::put('auth_otp_' . $request->phone, [
                'name' => $customer['name'],
                'odoo_id' => $customer['id'],
                'phone' => $customer['phone'],
                'otp_sent' => (bool)$otpResponse, // Indicates if OTP was attempted to be sent
                'verified' => false // Will be set to true after successful OTP verification
            ], 600);

            return response()->json([
                'success' => true,
                'message' => 'تم إرسال رمز التحقق عبر الواتساب',
                'data' => [
                    'name' => $customer['name'],
                    'phone' => $customer['phone'],
                    'otp_sent' => (bool)$otpResponse
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
     * Step 1.5: Verify OTP
     * POST /api/auth/verify-otp
     */
    public function verifyOtp(Request $request)
    {
        $request->validate([
            'phone' => 'required|string',
            'code' => 'required|string'
        ]);

        $isValid = $this->hyperSender->validateOtp($request->phone, $request->code);

        if (!$isValid) {
            return response()->json([
                'success' => false,
                'message' => 'رمز التحقق غير صحيح أو منتهي الصلاحية'
            ], 400);
        }

        // Mark as verified in cache
        $cacheKey = 'auth_otp_' . $request->phone;
        $cachedData = \Illuminate\Support\Facades\Cache::get($cacheKey);

        if ($cachedData) {
            $cachedData['verified'] = true;
            \Illuminate\Support\Facades\Cache::put($cacheKey, $cachedData, 600);
        } else {
             return response()->json([
                'success' => false,
                'message' => 'انتهت صلاحية الجلسة أو رقم الهاتف غير صحيح. يرجى إعادة التحقق.'
            ], 400);
        }

        return response()->json([
            'success' => true,
            'message' => 'تم التحقق بنجاح'
        ]);
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
            // 'odoo_id' & 'name' removed from validation
        ]);

        try {
            $cachedData = \Illuminate\Support\Facades\Cache::get('auth_otp_' . $request->phone);

            if (!$cachedData) {
                return response()->json([
                    'success' => false,
                    'message' => 'انتهت صلاحية الجلسة أو رقم الهاتف غير صحيح. يرجى إعادة التحقق.'
                ], 400);
            }

            $token = $this->authService->activateUser(
                $request->phone,
                $request->password,
                $cachedData['odoo_id'],
                $cachedData['name']
            );

            // Clear cache after success
            \Illuminate\Support\Facades\Cache::forget('auth_otp_' . $request->phone);

            return response()->json([
                'success' => true,
                'message' => 'Account activated successfully.',
                'token' => $token,
                'user' => [
                    'name' => $cachedData['name'],
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
            'fcm_token' => 'nullable|string'
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

        // Save fcm_token if provided by the client
        if ($request->filled('fcm_token')) {
            $user->fcm_token = $request->fcm_token;
            $user->save();
        }

        return response()->json([
            'success' => true,
            'message' => 'تم تسجيل الدخول بنجاح',
            'token' => $token,
            'type' => ucfirst($user->role),
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
