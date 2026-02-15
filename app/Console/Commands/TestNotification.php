<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;

class TestNotification extends Command
{
    protected $signature = 'test:notification {token}';
    protected $description = 'Test Firebase Notification by sending to a token';

    public function handle()
    {
        $token = $this->argument('token');
        $this->info("Sending test notification to: $token (Bypassing DB)");

        $service = new \App\Services\NotificationService();
        // Call sendHttp directly to bypass DB lookup and record creation
        $success = $service->sendHttp($token, 'Test Title', 'Test Body', ['type' => 'test']);

        if ($success) {
            $this->info('Notification sent successfully!');
        } else {
            $this->error('Failed to send notification. Check logs.');
        }
    }
}
