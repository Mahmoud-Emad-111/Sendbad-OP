<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class RequestActivity extends Model
{
    protected $fillable = [
        'request_id',
        'request_type',
        'user_id',
        'action',
        'description',
        'metadata',
    ];

    protected $casts = [
        'metadata' => 'array',
    ];

    public function request()
    {
        return $this->morphTo();
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
