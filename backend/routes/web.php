<?php

use Illuminate\Support\Facades\Route;

$frontendUrl = rtrim((string) env('FRONTEND_URL', 'http://localhost:3000'), '/');

$redirectToFrontend = static function (string $path = '') use ($frontendUrl) {
    $normalizedPath = ltrim($path, '/');

    return redirect()->away(
        $normalizedPath === ''
            ? $frontendUrl
            : $frontendUrl.'/'.$normalizedPath,
    );
};

Route::get('/', fn () => $redirectToFrontend());
Route::get('/login', fn () => $redirectToFrontend('login'))->name('login');
Route::get('/dashboard', fn () => $redirectToFrontend('dashboard'))->name('dashboard');
Route::get('/admin/users', fn () => $redirectToFrontend('admin/users'));
Route::get('/admin/school-structure', fn () => $redirectToFrontend('admin/school-structure'));
Route::get('/admin/settings', fn () => $redirectToFrontend('admin/settings'));
Route::get('/finance', fn () => $redirectToFrontend('finance'));
Route::get('/management/subjects', fn () => $redirectToFrontend('management/subjects'));
Route::get('/management/form-teachers', fn () => $redirectToFrontend('management/form-teachers'));
Route::get('/management/school-structure', fn () => $redirectToFrontend('management/school-structure'));
Route::get('/management/timetables', fn () => $redirectToFrontend('management/timetables'));
Route::get('/notifications', fn () => $redirectToFrontend('notifications'));
Route::get('/settings', fn () => $redirectToFrontend('settings'));
Route::get('/timetables', fn () => $redirectToFrontend('timetables'));

require __DIR__.'/auth.php';
