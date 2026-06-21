<?php

namespace Tests\Unit;

use Tests\TestCase;

class SessionTimeoutConfigTest extends TestCase
{
    public function test_session_lifetime_defaults_to_ten_minutes(): void
    {
        $this->assertSame(10, config('session.lifetime'));
    }
}
