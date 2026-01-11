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

    // Maintenance (Standard)
    Route::post('/requests', [\App\Http\Controllers\Api\ServiceRequestController::class, 'store'])
        ->middleware(['financial.eligibility', 'task.readiness']);

    // Installation (New)
    // Installation (New Table)
    Route::post('/requests/installation', [\App\Http\Controllers\Api\InstallationRequestController::class, 'store'])
        ->middleware(['financial.eligibility']);

    // List for Installation Page
    Route::get('/installation-requests', [\App\Http\Controllers\Api\InstallationRequestController::class, 'index']);
    Route::get('/installation-requests/{id}', [\App\Http\Controllers\Api\InstallationRequestController::class, 'show']);
    Route::post('/installation-requests/{id}/status', [\App\Http\Controllers\Api\InstallationRequestController::class, 'updateStatus']);
    Route::post('/installation-requests/{id}/assign', [\App\Http\Controllers\Api\InstallationRequestController::class, 'assignTechnician']);

    Route::get('/requests/check-eligibility', [\App\Http\Controllers\Api\ServiceRequestController::class, 'checkEligibility']);
    Route::get('/requests/{id}', [\App\Http\Controllers\Api\ServiceRequestController::class, 'show']);
    Route::post('/requests/{id}/status', [\App\Http\Controllers\Api\ServiceRequestController::class, 'updateStatus']);
    Route::post('/requests/{id}/attachments', [\App\Http\Controllers\Api\ServiceRequestController::class, 'addAttachment']);
    Route::post('/requests/{id}/rate', [\App\Http\Controllers\Api\ServiceRequestController::class, 'rate']);

    // Admin Reports
    Route::get('/admin/reports/performance', [\App\Http\Controllers\Api\AdminController::class, 'getPerformanceReports']);
});
