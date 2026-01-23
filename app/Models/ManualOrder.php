<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ManualOrder extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'invoice_number',
        'quotation_template',
        'total_amount',
        'paid_amount',
        'remaining_amount',
        'status',
        'order_date'
    ];

    protected $casts = [
        'total_amount' => 'decimal:3',
        'paid_amount' => 'decimal:3',
        'remaining_amount' => 'decimal:3',
        'order_date' => 'date'
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
