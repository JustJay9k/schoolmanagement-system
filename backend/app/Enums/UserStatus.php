<?php

namespace App\Enums;

enum UserStatus: string
{
    case Active = 'active';
    case Pending = 'pending';
    case Denied = 'denied';
    case Inactive = 'inactive';
    case Suspended = 'suspended';

    public function label(): string
    {
        return match ($this) {
            self::Active => 'Active',
            self::Pending => 'Pending approval',
            self::Denied => 'Denied',
            self::Inactive => 'Inactive',
            self::Suspended => 'Suspended',
        };
    }

    /**
     * @return list<string>
     */
    public static function values(): array
    {
        return array_map(
            static fn (self $status): string => $status->value,
            self::cases(),
        );
    }
}
