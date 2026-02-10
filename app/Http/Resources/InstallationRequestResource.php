<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class InstallationRequestResource extends JsonResource
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
            'product_type' => $this->product_type,
            'quantity' => $this->quantity,
            'status' => $this->status,
            'invoice_number' => $this->invoice_number,
            'address' => $this->address,
            'is_site_ready' => $this->is_site_ready,
            'scheduled_at' => $this->scheduled_at ? $this->scheduled_at->toIso8601String() : null,
            'created_at' => $this->created_at->toIso8601String(),
            'user' => $this->user ? [
                'id' => $this->user->id,
                'name' => $this->user->name,
                'phone' => $this->user->phone,
            ] : null,
             'technician' => $this->technician ? [
                'id' => $this->technician->id,
                'name' => $this->technician->name,
                'phone' => $this->technician->phone,
            ] : null,
            'latitude' => $this->latitude,
            'longitude' => $this->longitude,
        ];
    }
}
