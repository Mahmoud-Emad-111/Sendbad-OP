<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use App\Models\ServiceRequest;
use App\Models\InstallationRequest;

class CheckPendingRequests
{
    /**
     * Handle an incoming request.
     *
     * @param  \Illuminate\Http\Request  $request
     * @param  \Closure  $next
     * @return mixed
     */
    public function handle(Request $request, Closure $next)
    {
        $user = $request->user();

        // Ensure user is authenticated
        if (!$user) {
            return response()->json(['success' => false, 'message' => 'Unauthorized'], 401);
        }

        // Determine request type based on the route
        // Assuming this middleware is applied to specific routes, we can infer the type
        // or we can check the path.

        $path = $request->path();

        if (str_contains($path, 'requests/installation')) {
            // Check for pending Installation Requests
            $hasPending = InstallationRequest::where('user_id', $user->id)
                ->whereNotIn('status', ['completed', 'cancelled', 'rejected'])
                ->exists();

            if ($hasPending) {
                return response()->json([
                    'success' => false,
                    'message' => 'لديك طلب تركيب قيد التنفيذ بالفعل. لا يمكنك إنشاء طلب جديد حتى يتم إكمال الطلب الحالي.'
                ], 400);
            }
        } elseif (str_contains($path, 'api/requests') || $request->is('api/requests')) {
            // Check for pending Service Requests (Maintenance)
            // Note: Installation route is 'requests/installation' which also contains 'requests',
            // so we need to be careful with the order or the check logic.
            // But since 'requests/installation' was checked first, this block should be specific to standard requests if possible.
            // However, $request->is('api/requests') ensures it matches exactly that endpoint if we use specific matching.

            $hasPending = ServiceRequest::where('user_id', $user->id)
                ->whereNotIn('status', ['completed', 'cancelled', 'rejected'])
                ->exists();

            if ($hasPending) {
                return response()->json([
                    'success' => false,
                    'message' => 'لديك طلب صيانة قيد التنفيذ بالفعل. لا يمكنك إنشاء طلب جديد حتى يتم إكمال الطلب الحالي.'
                ], 400);
            }
        }

        return $next($request);
    }
}
