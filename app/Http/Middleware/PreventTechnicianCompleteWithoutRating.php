<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use App\Models\Rating;

class PreventTechnicianCompleteWithoutRating
{
    /**
     * Handle an incoming request.
     */
    public function handle(Request $request, Closure $next)
    {
        $user = $request->user();

        if (!$user) {
            return response()->json(['success' => false, 'message' => 'Unauthorized'], 401);
        }

        // Only apply to technicians trying to set status to 'completed'
        $desiredStatus = $request->input('status');
        if ($user->role !== 'technician' || $desiredStatus !== 'completed') {
            return $next($request);
        }

        // Determine request type from path: installation-requests vs requests
        $path = $request->path();
        $type = str_contains($path, 'installation-requests') ? 'installation' : 'service';

        $id = $request->route('id');
        if (!$id) {
            return response()->json(['success' => false, 'message' => 'Invalid request id'], 400);
        }

        $hasRating = Rating::where('request_id', $id)
            ->where('request_type', $type)
            ->exists();

        if (!$hasRating) {
            return response()->json([
                'success' => false,
                'message' => 'لا يمكن للفني إتمام الطلب قبل وجود تقييم (rating) من العميل.'
            ], 403);
        }

        return $next($request);
    }
}
