<?php

namespace App\Services;

use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Http;
use App\Jobs\SendPushNotification;
use App\Models\Notification as NotificationModel;
use App\Models\User;
use Google\Auth\Credentials\ServiceAccountCredentials;

class NotificationService
{
    /**
     * Send or dispatch a push notification to a single FCM token.
     * If NOTIFICATION_ASYNC=true the actual HTTP send will be dispatched to a Job.
     *
     * @param string $fcmToken
     * @param string $title
     * @param string $body
     * @param array $data
     * @return bool
     */
    public function sendNotification(string $fcmToken, string $title, string $body, array $data = []): bool
    {
        $async = config('services.notifications.async', env('NOTIFICATION_ASYNC', true));

        // Try to resolve recipient by fcm_token
        $recipient = User::where('fcm_token', $fcmToken)->first();

        // Persist notification record
        try {
            NotificationModel::create([
                'recipient_id' => $recipient->id ?? null,
                'title' => $title,
                'body' => $body,
                'type' => $data['type'] ?? null,
                'data' => $data,
            ]);
        } catch (\Exception $e) {
            Log::error('Failed to persist notification record: ' . $e->getMessage());
        }

        if ($async) {
            SendPushNotification::dispatch($fcmToken, $title, $body, $data);
            return true;
        }

        return $this->sendHttp($fcmToken, $title, $body, $data);
    }

    /**
     * Perform the HTTP call to FCM legacy endpoint.
     */
    public function sendHttp(string $fcmToken, string $title, string $body, array $data = []): bool
    {
        // Prefer HTTP v1 if service account JSON exists
        $credPath = storage_path('app/firebase_credentials.json');
        if (file_exists($credPath)) {
            try {
                $json = json_decode(file_get_contents($credPath), true);
                $projectId = $json['project_id'] ?? null;
                if (!$projectId) {
                    Log::error('FCM credentials missing project_id');
                    return false;
                }

                $scopes = ['https://www.googleapis.com/auth/firebase.messaging'];
                $creds = new ServiceAccountCredentials($scopes, $json);
                $token = $creds->fetchAuthToken();
                $accessToken = $token['access_token'] ?? null;

                if (empty($accessToken)) {
                    Log::error('Unable to obtain access token for FCM HTTP v1');
                    return false;
                }

                $url = "https://fcm.googleapis.com/v1/projects/{$projectId}/messages:send";
                // Convert data values to strings as required by FCM
                $stringData = array_map(function ($v) { return is_string($v) ? $v : json_encode($v); }, $data);

                $payload = [
                    'message' => [
                        'token' => $fcmToken,
                        'notification' => [
                            'title' => $title,
                            'body' => $body
                        ],
                        'data' => $stringData
                    ]
                ];

                $res = Http::withHeaders([
                    'Authorization' => 'Bearer ' . $accessToken,
                    'Content-Type' => 'application/json'
                ])->post($url, $payload);

                if ($res->successful()) {
                    return true;
                }

                Log::error('FCM v1 send failed', ['status' => $res->status(), 'body' => $res->body()]);
                return false;
            } catch (\Exception $e) {
                Log::error('FCM v1 exception: ' . $e->getMessage());
                // fallthrough to legacy if present
            }
        }

        // Fallback to legacy HTTP key method
        $serverKey = env('FCM_SERVER_KEY');

        if (empty($serverKey)) {
            Log::error('FCM server key not configured (FCM_SERVER_KEY).');
            return false;
        }

        $payload = [
            'to' => $fcmToken,
            'priority' => 'high',
            'notification' => [
                'title' => $title,
                'body' => $body,
                'sound' => 'default'
            ],
            'data' => $data
        ];

        try {
            $res = Http::withHeaders([
                'Authorization' => 'key=' . $serverKey,
                'Content-Type' => 'application/json'
            ])->post('https://fcm.googleapis.com/fcm/send', $payload);

            if ($res->successful()) {
                return true;
            }

            Log::error('FCM send failed', ['status' => $res->status(), 'body' => $res->body()]);
            return false;
        } catch (\Exception $e) {
            Log::error('FCM send exception: ' . $e->getMessage());
            return false;
        }
    }
}
