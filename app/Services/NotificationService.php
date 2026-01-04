<?php

namespace App\Services;

use Google\Auth\Credentials\ServiceAccountCredentials;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class NotificationService
{
    protected $credentialsData;
    protected $projectId;

    public function __construct()
    {
        // Try to load credentials from file defined in env
        $path = env('FIREBASE_CREDENTIALS', storage_path('app/firebase_credentials.json'));

        if (file_exists($path)) {
            $this->credentialsData = json_decode(file_get_contents($path), true);
            $this->projectId = $this->credentialsData['project_id'] ?? null;
        }
    }

    /**
     * Send OTP or Status Notification
     */
    public function sendNotification($token, $title, $body, $data = [])
    {
        if (!$token || !$this->projectId || !$this->credentialsData) {
            Log::warning('FCM: Missing token or credentials');
            return false;
        }

        try {
            $accessToken = $this->getAccessToken();

            $url = "https://fcm.googleapis.com/v1/projects/{$this->projectId}/messages:send";

            $payload = [
                'message' => [
                    'token' => $token,
                    'notification' => [
                        'title' => $title,
                        'body' => $body,
                    ],
                    'data' => $data,
                    // Android specific configuration for priority
                    'android' => [
                        'priority' => 'high',
                        'notification' => [
                            'sound' => 'default',
                            'channel_id' => 'default'
                        ]
                    ],
                    // APNs (iOS) specific configuration
                    'apns' => [
                        'payload' => [
                            'aps' => [
                                'sound' => 'default'
                            ]
                        ]
                    ]
                ]
            ];

            $response = Http::withToken($accessToken)
                ->withHeaders(['Content-Type' => 'application/json'])
                ->post($url, $payload);

            if ($response->successful()) {
                Log::info("FCM Sent: {$title} to {$token}");
                return true;
            } else {
                Log::error('FCM Error: ' . $response->body());
                return false;
            }

        } catch (\Exception $e) {
            Log::error('FCM Exception: ' . $e->getMessage());
            return false;
        }
    }

    protected function getAccessToken()
    {
        $scopes = ['https://www.googleapis.com/auth/firebase.messaging'];
        $credentials = new ServiceAccountCredentials($scopes, $this->credentialsData);
        $token = $credentials->fetchAuthToken();
        return $token['access_token'];
    }
}
