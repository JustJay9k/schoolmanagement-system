<?php

use App\Http\Controllers\Api\Admin\AdminSchoolStructureApiController;
use App\Http\Controllers\Api\Admin\AdminUserApiController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

Route::middleware(['auth:sanctum'])->get('/user', function (Request $request) {
    return $request->user();
});

Route::middleware(['auth:sanctum', 'admin'])->prefix('admin')->group(function () {
    Route::get('/users', [AdminUserApiController::class, 'index']);
    Route::post('/users', [AdminUserApiController::class, 'store']);
    Route::put('/users/{user}', [AdminUserApiController::class, 'update']);
    Route::patch('/users/{user}/status', [AdminUserApiController::class, 'updateStatus']);
    Route::delete('/users/{user}', [AdminUserApiController::class, 'destroy']);

    Route::get('/school-structure', [AdminSchoolStructureApiController::class, 'show']);
    Route::put('/school-structure', [AdminSchoolStructureApiController::class, 'update']);
});
