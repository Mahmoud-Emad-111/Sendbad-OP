<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Notification;

class NotificationController extends Controller
{
    /**
     * Return notifications for the authenticated user (or technician)
     * GET /api/notifications
     */
    public function index(Request $request)
    {
        $user = $request->user();

        $query = Notification::where('recipient_id', $user->id)->orderBy('created_at', 'desc');

        if ($request->filled('unread') && $request->boolean('unread')) {
            $query->whereNull('read_at');
        }

        // $perPage = (int) $request->get('per_page', 20);

        // $notifications = $query->paginate($perPage);
        $notifications = $query->get();

        return response()->json([
            'success' => true,
            'data' => $notifications
        ]);
    }

    /**
     * Mark a notification as read
     * POST /api/notifications/{id}/read
     */
    public function markRead(Request $request)
    {
        $user = $request->user();
        $notification = Notification::where('id', $request->notification_id)->where('recipient_id', $user->id)->firstOrFail();
        $notification->read_at = now();
        $notification->save();

        return response()->json(['success' => true]);
    }
}
