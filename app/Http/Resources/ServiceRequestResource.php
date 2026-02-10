<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ServiceRequestResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'service_type' => $this->service_type,
            'description' => $this->description,
            'status' => $this->status,
            'scheduled_at' => $this->scheduled_at ? $this->scheduled_at->toIso8601String() : null,
            'created_at' => $this->created_at->toIso8601String(),
            'invoice_number' => $this->invoice_number,
            'address' => $this->address,
            // User: Send only ID, Name, Phone
            'user' => $this->user ? [
                'id' => $this->user->id,
                'name' => $this->user->name,
                'phone' => $this->user->phone,
            ] : null,
            // Technician: Send only ID, Name, Phone
            'technician' => $this->technician ? [
                'id' => $this->technician->id,
                'name' => $this->technician->name,
                'phone' => $this->technician->phone,
            ] : null,
            // Attachments: Just count or First Image for thumbnail if needed?
            // User didn't specify, but for "performance" maybe just count is enough for list?
            // But frontend "View Details" might need them? No, "View Details" calls `show` endpoint.
            // But Map Modal might need lat/long.
            'latitude' => $this->latitude,
            'longitude' => $this->longitude,
            'task_end_time' => $this->task_end_time,
        ];
    }
}
