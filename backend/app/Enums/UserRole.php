<?php

namespace App\Enums;

enum UserRole: string
{
    case Admin = 'admin';
    case Staff = 'staff';
    case Teacher = 'teacher';
    case Accountant = 'accountant';
    case Student = 'student';
    case Guardian = 'guardian';

    public function label(): string
    {
        return match ($this) {
            self::Admin => 'Administrator',
            self::Staff => 'Operations Staff',
            self::Teacher => 'Teacher',
            self::Accountant => 'Accountant',
            self::Student => 'Student',
            self::Guardian => 'Guardian',
        };
    }

    /**
     * @return list<string>
     */
    public static function values(): array
    {
        return array_map(
            static fn (self $role): string => $role->value,
            self::cases(),
        );
    }
}
