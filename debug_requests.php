<?php

use App\Models\ServiceRequest;
use App\Models\User;
use App\Models\InstallationRequest;

require __DIR__.'/vendor/autoload.php';
$app = require_once __DIR__.'/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

echo "--- Service Requests Debug Info ---\n";
echo "Total Service Requests: " . ServiceRequest::count() . "\n";
echo "Distinct Statuses: " . implode(', ', ServiceRequest::distinct()->pluck('status')->toArray()) . "\n";
echo "Distinct Service Types: " . implode(', ', ServiceRequest::distinct()->pluck('service_type')->toArray()) . "\n";

$orphaned = ServiceRequest::doesntHave('user')->count();
echo "Requests without User (Orphaned): $orphaned\n";

$orphanedTech = ServiceRequest::whereNotNull('technician_id')->doesntHave('technician')->count();
echo "Requests with Invalid Technician ID: $orphanedTech\n";

echo "\n--- Installation Requests Debug Info ---\n";
echo "Total Installation Requests: " . InstallationRequest::count() . "\n";
echo "Distinct Statuses: " . implode(', ', InstallationRequest::distinct()->pluck('status')->toArray()) . "\n";

echo "\n--- Recent 5 Service Requests ---\n";
$recent = ServiceRequest::latest()->take(5)->get();
foreach ($recent as $req) {
    echo "ID: {$req->id}, ValidUser: " . ($req->user ? 'Yes' : 'No') . ", Type: {$req->service_type}, Status: {$req->status}\n";
}

echo "\n--- User Role Check ---\n";
// Can't check current user without login, but can list admin count
echo "Admin Count: " . User::where('role', 'admin')->count() . "\n";
