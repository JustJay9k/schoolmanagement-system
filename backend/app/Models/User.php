<?php

namespace App\Models;

use App\Enums\UserRole;
use App\Enums\UserStatus;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
// use Illuminate\Contracts\Auth\MustVerifyEmail;
use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

#[Fillable(['name', 'email', 'password', 'role', 'status', 'school_id', 'linked_student_record_id', 'school_track', 'assigned_class_name', 'profile_photo_path', 'last_login_at', 'email_verified_at'])]
#[Hidden(['password', 'remember_token'])]
class User extends Authenticatable
{
    /** @use HasFactory<UserFactory> */
    use HasApiTokens, HasFactory, Notifiable;

    protected $appends = [
        'profile_photo_url',
    ];

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

    protected function setEmailAttribute(?string $value): void
    {
        $this->attributes['email'] = is_string($value)
            ? Str::lower(Str::squish($value))
            : $value;
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

    public function isAccountant(): bool
    {
        return $this->role === UserRole::Accountant;
    }

    public function isGuardian(): bool
    {
        return $this->role === UserRole::Guardian;
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
        if (! $this->isActive()) {
            return false;
        }

        if (! $this->isAdmin() && $this->schoolIsLocked()) {
            return false;
        }

        return in_array($this->role, [
            UserRole::Admin,
            UserRole::Management,
            UserRole::Teacher,
            UserRole::Accountant,
            UserRole::Guardian,
        ], true);
    }

    public function canManageAdministration(): bool
    {
        return $this->isAdmin() && $this->isActive();
    }

    public function canManageTimetables(): bool
    {
        return $this->isHeadTeacher() && $this->isActive() && ! $this->schoolIsLocked();
    }

    public function canManageSchoolStructure(): bool
    {
        return $this->isActive()
            && ($this->isAdmin() || ($this->isHeadTeacher() && filled($this->school_id) && ! $this->schoolIsLocked()));
    }

    public function canManageFinance(): bool
    {
        return $this->isAccountant() && $this->isActive() && ! $this->schoolIsLocked();
    }

    public function canAddStudentRecords(): bool
    {
        return $this->isTeacher()
            && $this->isActive()
            && filled($this->school_id)
            && filled($this->school_track)
            && filled($this->assigned_class_name)
            && ! $this->schoolIsLocked();
    }

    public function canManageAssignedStudentClass(string $schoolTrack, string $className): bool
    {
        return $this->canAddStudentRecords()
            && $this->school_track === $schoolTrack
            && $this->assigned_class_name === $className;
    }

    public function canAccessAdminPanel(): bool
    {
        return $this->canManageAdministration();
    }

    public function schoolIsLocked(): bool
    {
        if (! $this->school_id) {
            return false;
        }

        $school = $this->relationLoaded('school')
            ? $this->school
            : $this->school()->first(['id', 'is_locked']);

        return (bool) $school?->is_locked;
    }

    public function isFormTeacher(): bool
    {
        return $this->isTeacher()
            && $this->school_track === 'secondary'
            && filled($this->assigned_class_name);
    }

    /**
     * @return list<string>
     */
    public function teachingRoles(): array
    {
        if (! $this->isTeacher()) {
            return [];
        }

        $roles = ['subject_teacher'];

        if (in_array($this->school_track, ['preschool', 'primary'], true) && filled($this->assigned_class_name)) {
            $roles[] = 'class_teacher';
        }

        if ($this->isFormTeacher()) {
            $roles[] = 'form_teacher';
        }

        return $roles;
    }

    public function assignedTimetables(): HasMany
    {
        return $this->hasMany(Timetable::class, 'assigned_teacher_id');
    }

    public function notifications(): HasMany
    {
        return $this->hasMany(UserNotification::class)->latest();
    }

    public function getProfilePhotoUrlAttribute(): ?string
    {
        if (! filled($this->profile_photo_path)) {
            return null;
        }

        return Storage::disk('public')->url($this->profile_photo_path);
    }

    public function school(): BelongsTo
    {
        return $this->belongsTo(School::class);
    }

    public function linkedStudentRecord(): BelongsTo
    {
        return $this->belongsTo(StudentRecord::class, 'linked_student_record_id');
    }

    public function subjectAssignments(): HasMany
    {
        return $this->hasMany(TeacherSubjectAssignment::class, 'teacher_id');
    }

    public function performanceRecordsAuthored(): HasMany
    {
        return $this->hasMany(StudentPerformanceRecord::class, 'teacher_id');
    }

    public function merchandiseItemsCreated(): HasMany
    {
        return $this->hasMany(SchoolMerchandiseItem::class, 'created_by');
    }

    public function registerReports(): HasMany
    {
        return $this->hasMany(RegisterReport::class, 'teacher_id');
    }
}
