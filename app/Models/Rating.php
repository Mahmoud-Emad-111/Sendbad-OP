<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Rating extends Model
{
    use HasFactory;

    protected $fillable = [
        'request_id',
        'request_type',
        'user_id',
        'product_rating',
        'service_rating',
        'how_found_us',
        'customer_notes',
    ];

    protected $casts = [
        'product_rating' => 'integer',
        'service_rating' => 'integer',
    ];

    /**
     * Get the user who submitted the rating
     */
    public function user()
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Get the rated request (polymorphic)
     */
    public function request()
    {
        if ($this->request_type === 'service') {
            return $this->belongsTo(ServiceRequest::class, 'request_id');
        } elseif ($this->request_type === 'installation') {
            return $this->belongsTo(InstallationRequest::class, 'request_id');
        }
        return null;
    }
}
