<?php

namespace App\Services;

use App\Models\RequestActivity;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Auth;

class ActivityLogger
{
    /**
     * Log an activity for a request.
     *
     * @param Model $request The request model (ServiceRequest or InstallationRequest)
     * @param string $action The action performed (e.g., 'created', 'status_updated')
     * @param string|null $description Human-readable description
     * @param array|null $metadata Additional data (old/new values)
     * @return RequestActivity
     */
    public function log(Model $request, string $action, ?string $description = null, ?array $metadata = [])
    {
        return RequestActivity::create([
            'request_id' => $request->id,
            'request_type' => $request->getMorphClass(), // Use morph alias if defined
            'user_id' => Auth::id(), // Current logged-in user
            'action' => $action,
            'description' => $description,
            'metadata' => $metadata,
        ]);
    }
}
