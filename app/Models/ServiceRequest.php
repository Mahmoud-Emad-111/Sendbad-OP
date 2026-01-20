<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ServiceRequest extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'technician_id',
        'service_type',
        'details', // JSON payload for dynamic fields
        'description',
        'scheduled_at',
        'end_date',
        'address',
        'latitude',
        'longitude',
        'status',
        'rating',
        'review_comment',
        'completed_at',
        'task_start_time',
        'task_end_time',
        'invoice_number'
    ];

    protected $casts = [
        'details' => 'array',
        'scheduled_at' => 'date',
        'end_date' => 'date',
        'completed_at' => 'datetime',
        'task_start_time' => 'datetime',
        'task_end_time' => 'datetime',
        'latitude' => 'float',
        'longitude' => 'float',
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
}
