<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SchoolGradeBand extends Model
{
    protected $fillable = [
        'school_id',
        'letter',
        'min_percentage',
        'max_percentage',
        'created_by',
    ];

    public function school(): BelongsTo
    {
        return $this->belongsTo(School::class);
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}