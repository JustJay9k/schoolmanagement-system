<?php

namespace App\Models;

use App\Enums\UserRole;
use App\Enums\UserStatus;
use Illuminate\Database\Eloquent\Relations\HasMany;
// use Illuminate\Contracts\Auth\MustVerifyEmail;
use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;

#[Fillable(['name', 'email', 'password', 'role', 'status', 'school_track', 'assigned_class_name', 'last_login_at', 'email_verified_at'])]
#[Hidden(['password', 'remember_token'])]
class User extends Authenticatable
{
    /** @use HasFactory<UserFactory> */
    use HasFactory, Notifiable;

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'last_login_at' => 'datetime',
            'password' => 'hashed',
            'role' => UserRole::class,
            'status' => UserStatus::class,
        ];
    }

    public function isAdmin(): bool
    {
        return $this->role === UserRole::Admin;
    }

    public function isActive(): bool
    {
        return $this->status === UserStatus::Active;
    }

    public function isTeacher(): bool
    {
        return $this->role === UserRole::Teacher;
    }

    public function isHeadTeacher(): bool
    {
        return $this->role === UserRole::Management;
    }

    public function isOperationalStaff(): bool
    {
        return in_array($this->role, [UserRole::Management, UserRole::Admin, UserRole::Staff], true);
    }

    public function canAccessPortal(): bool
    {
        return $this->isActive() && in_array($this->role, [
            UserRole::Admin,
            UserRole::Management,
            UserRole::Teacher,
        ], true);
    }

    public function canManageAdministration(): bool
    {
        return $this->isAdmin() && $this->isActive();
    }

    public function canManageTimetables(): bool
    {
        return $this->isHeadTeacher() && $this->isActive();
    }

    public function canAccessAdminPanel(): bool
    {
        return $this->canManageAdministration();
    }

    public function assignedTimetables(): HasMany
    {
        return $this->hasMany(Timetable::class, 'assigned_teacher_id');
    }
}
