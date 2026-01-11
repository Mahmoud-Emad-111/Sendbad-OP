<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureFinancialEligibility
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

        // Search Orders (Strict project + phone logic)
        $orders = $this->odoo->getCustomerOrders($user->odoo_id, $user->phone); // Name not needed for strict search now
        $invoices = $this->odoo->getCustomerInvoices($user->odoo_id, $user->phone);

        $dueFromOrders = collect($orders)->sum(function ($order) {
            return $order['amount_due']
                ?? $order['x_amount_due']
                ?? $order['amount_residual']
                ?? 0;
        });

        $dueFromInvoices = collect($invoices)->sum('amount_residual');
        $totalDue = $dueFromOrders + $dueFromInvoices;

        if ($totalDue > 0) {
            return response()->json([
                'success' => true, // Request handled, but result is negative
                'eligible' => false,
                'reason' => 'financial_due',
                'message' => 'عذراً، لديك مستحقات مالية معلقة. يرجى تسوية الحساب أولاً.',
                'amount_due' => $totalDue,
                'debug_info' => [
                    'orders_count' => count($orders),
                    'invoices_count' => count($invoices),
                    'total_due' => $totalDue
                ]
            ], 402); // Payment Required
        }

        return $next($request);
    }
}
