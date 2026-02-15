<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class InstallationRequest extends Model
{
    protected $fillable = [
        'user_id',
        'invoice_number',
        'technician_id',
        'product_type',
        'quantity',
        'is_site_ready',
        'readiness_details',
        'notes',
        'latitude',
        'longitude',
        'address',
        'scheduled_at',
        'end_date',
        'status',
        'completed_at'
    ];

    protected $casts = [
        'is_site_ready' => 'boolean',
        'readiness_details' => 'array',
        'scheduled_at' => 'date',
        'end_date' => 'date',
        'completed_at' => 'datetime',
        'latitude' => 'decimal:8',
        'longitude' => 'decimal:8',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function technician()
    {
        return $this->belongsTo(User::class, 'technician_id');
    }

    public function attachments()
    {
        return $this->morphMany(RequestAttachment::class, 'attachable');
    }

    public function rating()
    {
        return $this->hasOne(Rating::class, 'request_id')
            ->where('request_type', 'installation');
    }

    public function activities()
    {
        return $this->morphMany(RequestActivity::class, 'request');
    }
}
