<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\Odoo\OdooService;
use Illuminate\Http\Request;

class OdooController extends Controller
{
    protected $odooService;

    public function __construct(OdooService $odooService)
    {
        $this->odooService = $odooService;
    }

    /**
     * Get Products from Odoo
     */
    public function getProducts(Request $request)
    {
        if ($request->user()->role !== 'admin') {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $products = $this->odooService->getProducts(100); // Limit 100 for now

        return response()->json([
            'success' => true,
            'data' => $products
        ]);
    }
}
