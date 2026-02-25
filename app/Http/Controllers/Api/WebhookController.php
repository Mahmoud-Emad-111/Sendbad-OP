<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class WebhookController extends Controller
{
    /**
     * Handle incoming HyperSender Webhooks
     * POST /api/webhooks/hypersender
     */
    public function handleHyperSender(Request $request)
    {
        try {
            $payload = $request->all();

            // Log payload for debugging
            Log::info('HyperSender Webhook Received:', $payload);

            // Handle specific events here if needed
            // e.g., if ($payload['event'] === 'message.received') { ... }

            return response()->json(['status' => 'success'], 200);
        } catch (\Exception $e) {
            Log::error('HyperSender Webhook Error: ' . $e->getMessage());
            return response()->json(['status' => 'error'], 500);
        }
    }
}
