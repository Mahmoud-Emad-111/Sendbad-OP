<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Notification extends Model
{
    protected $fillable = [
        'recipient_id',
        'title',
        'body',
        'type',
        'data',
        'read_at'
    ];

    protected $casts = [
        'data' => 'array',
        'read_at' => 'datetime'
    ];

    public function recipient()
    {
        return $this->belongsTo(User::class, 'recipient_id');
    }
}
