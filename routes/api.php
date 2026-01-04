<?php

use App\Http\Controllers\Api\AuthController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

Route::prefix('auth')->group(function () {
    Route::post('/validate-phone', [AuthController::class, 'validatePhone']);
    Route::post('/activate', [AuthController::class, 'activate']);
    Route::post('/login', [AuthController::class, 'login']);
});

Route::middleware('auth:sanctum')->group(function () {
    Route::get('/profile', [AuthController::class, 'profile']);
    Route::post('/update-profile', [AuthController::class, 'updateProfile']);
    Route::get('/user', function (Request $request) {
        return $request->user();
    });



    // Service Requests
    Route::get('/requests', [\App\Http\Controllers\Api\ServiceRequestController::class, 'index']);
    Route::post('/requests', [\App\Http\Controllers\Api\ServiceRequestController::class, 'store']);
    Route::get('/requests/{id}', [\App\Http\Controllers\Api\ServiceRequestController::class, 'show']);
    Route::post('/requests/{id}/status', [\App\Http\Controllers\Api\ServiceRequestController::class, 'updateStatus']);
    Route::post('/requests/{id}/attachments', [\App\Http\Controllers\Api\ServiceRequestController::class, 'addAttachment']);
});
