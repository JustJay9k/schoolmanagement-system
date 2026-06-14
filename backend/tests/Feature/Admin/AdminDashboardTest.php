<?php

namespace Tests\Feature\Admin;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AdminDashboardTest extends TestCase
{
    use RefreshDatabase;

    public function test_backend_root_redirects_to_the_react_frontend(): void
    {
        $this->get('/')
            ->assertRedirect('http://localhost:3000');
    }

    public function test_backend_dashboard_redirects_to_the_react_dashboard(): void
    {
        $this->get('/dashboard')
            ->assertRedirect('http://localhost:3000/dashboard');
    }

    public function test_backend_login_page_redirects_to_the_react_login_screen(): void
    {
        $this->get('/login')
            ->assertRedirect('http://localhost:3000/login');
    }
}
