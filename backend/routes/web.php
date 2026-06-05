<?php

use App\Http\Controllers\Admin\AdminAuthenticatedSessionController;
use App\Http\Controllers\Admin\AdminDashboardController;
use App\Http\Controllers\Admin\AdminSchoolStructureController;
use App\Http\Controllers\Admin\AdminUserController;
use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    if (! auth()->check()) {
        return redirect()->route('login');
    }

    abort_unless(auth()->user()?->canAccessAdminPanel(), 403);

    return redirect()->route('dashboard');
});

Route::middleware('guest')->group(function () {
    Route::get('/login', [AdminAuthenticatedSessionController::class, 'create'])
        ->name('login');

    Route::post('/admin/login', [AdminAuthenticatedSessionController::class, 'store'])
        ->name('admin.login.store');
});

Route::middleware(['auth', 'admin'])->group(function () {
    Route::get('/dashboard', AdminDashboardController::class)
        ->name('dashboard');

    Route::post('/admin/logout', [AdminAuthenticatedSessionController::class, 'destroy'])
        ->name('admin.logout');

    Route::get('/admin/school-structure', [AdminSchoolStructureController::class, 'edit'])
        ->name('admin.school-structure.edit');
    Route::put('/admin/school-structure', [AdminSchoolStructureController::class, 'update'])
        ->name('admin.school-structure.update');

    Route::resource('/admin/users', AdminUserController::class)
        ->except('show')
        ->names('admin.users');
});

require __DIR__.'/auth.php';
