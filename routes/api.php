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
    Route::get('/requests/my-orders', [\App\Http\Controllers\Api\ServiceRequestController::class, 'getMyOrders']);

    // Notifications
    Route::get('/notifications', [\App\Http\Controllers\Api\NotificationController::class, 'index']);
    Route::post('/notifications/read', [\App\Http\Controllers\Api\NotificationController::class, 'markRead']);

    // Maintenance (Standard)
    Route::post('/requests', [\App\Http\Controllers\Api\ServiceRequestController::class, 'store']);
        // ->middleware(['financial.eligibility', 'task.readiness']);

    // Installation (New)
    // Installation (New Table)
    Route::post('/requests/installation', [\App\Http\Controllers\Api\InstallationRequestController::class, 'store'])
        ->middleware(['financial.eligibility']);

    // List for Installation Page
    Route::get('/installation-requests', [\App\Http\Controllers\Api\InstallationRequestController::class, 'index']);
    Route::get('/installation-requests/{id}', [\App\Http\Controllers\Api\InstallationRequestController::class, 'show']);
    Route::delete('/installation-requests/{id}', [\App\Http\Controllers\Api\InstallationRequestController::class, 'destroy']);
    Route::post('/installation-requests/{id}/status', [\App\Http\Controllers\Api\InstallationRequestController::class, 'updateStatus']);
    Route::post('/installation-requests/{id}/assign', [\App\Http\Controllers\Api\InstallationRequestController::class, 'assignTechnician']);

    Route::get('/requests/check-eligibility', [\App\Http\Controllers\Api\ServiceRequestController::class, 'checkEligibility']);
    Route::get('/requests/{id}', [\App\Http\Controllers\Api\ServiceRequestController::class, 'show']);
    Route::post('/requests/{id}/status', [\App\Http\Controllers\Api\ServiceRequestController::class, 'updateStatus']);
    Route::post('/requests/{id}/attachments', [\App\Http\Controllers\Api\ServiceRequestController::class, 'addAttachment']);
    Route::delete('/requests/{id}', [\App\Http\Controllers\Api\ServiceRequestController::class, 'destroy']);
    Route::post('/requests/{id}/rate', [\App\Http\Controllers\Api\ServiceRequestController::class, 'rate']);

    // Rating Endpoints (For Mobile App)
    Route::post('/requests/{id}/rating', [\App\Http\Controllers\Api\ServiceRequestController::class, 'submitRating'])->name('service_requests.rating');
    Route::post('/installation-requests/{id}/rating', [\App\Http\Controllers\Api\ServiceRequestController::class, 'submitRating'])->name('installation_requests.rating');

    // Admin Reports
    Route::get('/admin/reports/performance', [\App\Http\Controllers\Api\AdminController::class, 'getPerformanceReports']);

    // Admin - User Lookup for Request Creation
    Route::get('/admin/users/lookup/{phone}', [\App\Http\Controllers\Api\AdminController::class, 'lookupUserByPhone']);
    Route::post('/admin/users', [\App\Http\Controllers\Api\AdminController::class, 'storeUser']); // <--- Added
    Route::delete('/admin/users/{id}', [\App\Http\Controllers\Api\AdminController::class, 'deleteUser']);

    // Admin - Create Request on behalf of user
    Route::post('/admin/requests', [\App\Http\Controllers\Api\AdminController::class, 'createServiceRequest']);
    Route::post('/admin/installation-requests', [\App\Http\Controllers\Api\AdminController::class, 'createInstallationRequest']);
    Route::put('/installation-requests/{id}/readiness', [\App\Http\Controllers\Api\InstallationRequestController::class, 'updateReadiness']);
    Route::get('/admin/technicians/available', [\App\Http\Controllers\Api\AdminController::class, 'getAvailableTechnicians']);

    // Technician App Routes
    Route::get('/technician/schedule', [\App\Http\Controllers\Api\ServiceRequestController::class, 'getMySchedule']);
    Route::post('/technician/installation-requests/accept', [\App\Http\Controllers\Api\InstallationRequestController::class, 'acceptRequest']);
    Route::post('/technician/service-requests/accept', [\App\Http\Controllers\Api\ServiceRequestController::class, 'acceptRequest']);
});
