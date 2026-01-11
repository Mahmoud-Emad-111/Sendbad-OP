<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\AdminController;
use App\Http\Controllers\Api\ServiceRequestController;

Route::middleware('auth:sanctum')->group(function () {
    Route::get('/users', [AdminController::class, 'getUsers']);
    Route::get('/users/{id}', [AdminController::class, 'getUserDetails']); // New Route
    Route::post('/technicians', [AdminController::class, 'createTechnician']);
    Route::post('/admins', [AdminController::class, 'createSubAdmin']);
    Route::get('/stats', [AdminController::class, 'dashboardStats']);

    // Odoo Routes
    Route::get('/odoo/products', [\App\Http\Controllers\Api\OdooController::class, 'getProducts']);

    Route::post('/requests/{id}/assign', [ServiceRequestController::class, 'assignTechnician']);
});
