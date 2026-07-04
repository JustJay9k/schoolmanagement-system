<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable(['name'])]
class School extends Model
{
    use HasFactory;

    public function users(): HasMany
    {
        return $this->hasMany(User::class);
    }

    public function merchandiseItems(): HasMany
    {
        return $this->hasMany(SchoolMerchandiseItem::class);
    }

    public function registerReports(): HasMany
    {
        return $this->hasMany(RegisterReport::class);
    }
}
