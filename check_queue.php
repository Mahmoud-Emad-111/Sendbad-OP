<?php

use Illuminate\Support\Facades\DB;
use App\Models\User;
use App\Models\Notification;

require __DIR__.'/vendor/autoload.php';
$app = require_once __DIR__.'/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

echo "--- Queue & Notification Debug ---\n";

try {
    $jobs = DB::table('jobs')->count();
    echo "Pending Jobs: $jobs\n";

    $failed = DB::table('failed_jobs')->count();
    echo "Failed Jobs: $failed\n";

    $notifs = Notification::count();
    echo "Total Notifications in DB: $notifs\n";

    $recentNotifs = Notification::latest()->take(3)->get();
    foreach ($recentNotifs as $n) {
        echo "Recent Notif [{$n->created_at}]: Type={$n->type}, Title={$n->title}\n";
    }

    $usersWithToken = User::whereNotNull('fcm_token')->count();
    echo "Users with FCM Token: $usersWithToken\n";

    $users = User::whereNotNull('fcm_token')->take(3)->get(['id', 'email', 'fcm_token']);
    foreach($users as $u) {
        $shortToken = substr($u->fcm_token, 0, 15) . '...';
        echo "User #{$u->id} ({$u->email}): $shortToken\n";
    }

} catch (\Exception $e) {
    echo "DB Error: " . $e->getMessage() . "\n";
}
