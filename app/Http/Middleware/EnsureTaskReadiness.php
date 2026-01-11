<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureTaskReadiness
{
    public function __construct(protected \App\Services\Odoo\OdooIntegrationInterface $odoo)
    {
    }

    /**
     * Handle an incoming request.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if (!$user || !$user->odoo_id) {
             return response()->json([
                'success' => false,
                'message' => 'User not verified or not linked to Odoo.'
            ], 401);
        }

        // Check if task is "Product complete" (Stage ID 132 for example)
        $isReady = $this->odoo->checkTaskReadiness($user->odoo_id);

        if (!$isReady) {
            return response()->json([
                'success' => true,
                'eligible' => false,
                'reason' => 'task_not_ready',
                'message' => 'عذراً، يجب أن تكون حالة المشروع "المنتج مكتمل" (Product complete) لطلب خدمة.',
            ], 403); // Forbidden
        }

        return $next($request);
    }
}
