<?php

namespace App\Jobs;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Http;
use Google\Auth\Credentials\ServiceAccountCredentials;

class SendPushNotification implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public string $fcmToken;
    public string $title;
    public string $body;
    public array $data;

    public function __construct(string $fcmToken, string $title, string $body, array $data = [])
    {
        $this->fcmToken = $fcmToken;
        $this->title = $title;
        $this->body = $body;
        $this->data = $data;
    }

    public function handle(): void
    {
        // Prefer HTTP v1 if credentials JSON exists
        $credPath = storage_path('app/firebase_credentials.json');
        if (file_exists($credPath)) {
            try {
                $json = json_decode(file_get_contents($credPath), true);
                $projectId = $json['project_id'] ?? null;
                if (!$projectId) {
                    Log::error('FCM credentials missing project_id');
                    return;
                }

                $scopes = ['https://www.googleapis.com/auth/firebase.messaging'];
                $creds = new ServiceAccountCredentials($scopes, $json);
                $token = $creds->fetchAuthToken();
                $accessToken = $token['access_token'] ?? null;

                if (empty($accessToken)) {
                    Log::error('Unable to obtain access token for FCM HTTP v1');
                } else {
                    $url = "https://fcm.googleapis.com/v1/projects/{$projectId}/messages:send";
                    $stringData = array_map(function ($v) { return is_string($v) ? $v : json_encode($v); }, $this->data);
                    $payload = [
                        'message' => [
                            'token' => $this->fcmToken,
                            'notification' => [
                                'title' => $this->title,
                                'body' => $this->body
                            ],
                            'data' => $stringData
                        ]
                    ];

                    $res = Http::withHeaders([
                        'Authorization' => 'Bearer ' . $accessToken,
                        'Content-Type' => 'application/json'
                    ])->post($url, $payload);

                    if (! $res->successful()) {
                        Log::error('FCM v1 job failed', ['status' => $res->status(), 'body' => $res->body()]);
                    }
                    return;
                }
            } catch (\Exception $e) {
                Log::error('FCM v1 job exception: ' . $e->getMessage());
                // fallthrough to legacy
            }
        }

        // Fallback to legacy HTTP key method
        $serverKey = env('FCM_SERVER_KEY');

        if (empty($serverKey)) {
            Log::error('FCM server key not configured (FCM_SERVER_KEY).');
            return;
        }

        $payload = [
            'to' => $this->fcmToken,
            'priority' => 'high',
            'notification' => [
                'title' => $this->title,
                'body' => $this->body,
                'sound' => 'default'
            ],
            'data' => $this->data
        ];

        try {
            $res = Http::withHeaders([
                'Authorization' => 'key=' . $serverKey,
                'Content-Type' => 'application/json'
            ])->post('https://fcm.googleapis.com/fcm/send', $payload);

            if (! $res->successful()) {
                Log::error('FCM job failed', ['status' => $res->status(), 'body' => $res->body()]);
            }
        } catch (\Exception $e) {
            Log::error('FCM job exception: ' . $e->getMessage());
        }
    }
}
