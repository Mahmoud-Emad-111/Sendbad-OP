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
        'image_path',
    ];

    protected $casts = [
        'product_rating' => 'integer',
        'service_rating' => 'integer',
    ];

    protected $appends = ['image_url'];

    public function getImageUrlAttribute()
    {
        return $this->image_path ? asset('storage/' . $this->image_path) : null;
    }

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
    /**
     * Get the rated request (polymorphic)
     */
    public function request()
    {
        return $this->morphTo(__FUNCTION__, 'request_type', 'request_id');
    }
}
