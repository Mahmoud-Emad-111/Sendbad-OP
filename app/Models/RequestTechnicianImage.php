<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class RequestTechnicianImage extends Model
{
    use HasFactory;

    protected $fillable = [
        'request_id',
        'request_type',
        'technician_id',
        'image_path',
        'notes'
    ];

    protected $appends = ['image_url'];

    /**
     * Get the full URL for the image
     */
    public function getImageUrlAttribute()
    {
        return asset('storage/' . $this->image_path);
    }

    /**
     * Get the technician who uploaded this image
     */
    public function technician()
    {
        return $this->belongsTo(User::class, 'technician_id');
    }

    /**
     * Get the request (polymorphic)
     */
    public function request()
    {
        if ($this->request_type === 'service') {
            return $this->belongsTo(ServiceRequest::class, 'request_id');
        }
        return $this->belongsTo(InstallationRequest::class, 'request_id');
    }
}
