<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class RequestAttachment extends Model
{
    use HasFactory;

    protected $fillable = ['attachable_id', 'attachable_type', 'file_path', 'file_type'];

    public function attachable()
    {
        return $this->morphTo();
    }
}
