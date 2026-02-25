<?php

namespace App\Services\WhatsApp;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class HyperSenderService
{
    protected $baseUrl = 'https://app.hypersender.com/api/otp/v2';
    protected $token;
    protected $instanceUuid;

    public function __construct()
    {
        $this->token = env('HYPERSENDER_API_TOKEN');
        $this->instanceUuid = env('HYPERSENDER_INSTANCE_UUID');
    }

    /**
     * Send OTP Code via WhatsApp
     *
     * @param string $phone
     * @return array|null
     */
    public function sendOtp($phone)
    {
        // Debug Config
        Log::info('HyperSender Debug: Check Config', [
            'token_exists' => !empty($this->token),
            'uuid_exists' => !empty($this->instanceUuid),
            'uuid_sample' => substr($this->instanceUuid ?? '', 0, 5) . '...',
            'url' => "{$this->baseUrl}/{$this->instanceUuid}/request-code"
        ]);

        if (!$this->token || !$this->instanceUuid) {
            Log::error('HyperSender configuration missing in Service');
            return null;
        }

        try {
            $url = "{$this->baseUrl}/{$this->instanceUuid}/request-code";

            // Format chatId: remove + and 00, ensure @c.us suffix
            $formattedPhone = preg_replace('/^(\+|00)/', '', $phone);
            if (!str_ends_with($formattedPhone, '@c.us')) {
                $formattedPhone .= '@c.us';
            }

            $payload = [
                'chatId' => $formattedPhone,
                'length' => 4,
                'useNumber' => true,
                'useLetter' => false,
                'allCapital' => true, // Required by API
                'name' => 'Sindbad', // Required by API
                'expires' => 300 // 5 minutes
            ];

            Log::info('HyperSender sending request...', $payload);

            $response = Http::withoutVerifying()
                ->acceptJson()
                ->withToken($this->token)
                ->post($url, $payload);

            Log::info('HyperSender Response Status: ' . $response->status());
            Log::info('HyperSender Response Body: ' . $response->body());

            if ($response->successful()) {
                return $response->json();
            }

            Log::error('HyperSender Send OTP Failed: ' . $response->body());
            return null;
        } catch (\Exception $e) {
            Log::error('HyperSender Service Error: ' . $e->getMessage());
            return null;
        }
    }

    /**
     * Validate OTP Code
     *
     * @param string $phone
     * @param string $code
     * @return boolean
     */
    public function validateOtp($phone, $code)
    {
        if (!$this->token || !$this->instanceUuid) {
            return false;
        }

        try {
            $url = "{$this->baseUrl}/{$this->instanceUuid}/validate-code";

            // Format chatId
            $formattedPhone = preg_replace('/^(\+|00)/', '', $phone);
            if (!str_ends_with($formattedPhone, '@c.us')) {
                $formattedPhone .= '@c.us';
            }

            $response = Http::withoutVerifying()->withToken($this->token)->post($url, [
                'chatId' => $formattedPhone,
                'code' => $code
            ]);

            if ($response->successful()) {
                $data = $response->json();
                // Check status from response (based on docs: status: 'validated')
                return isset($data['status']) && $data['status'] === 'validated';
            }

            Log::error('HyperSender Validate OTP Failed: ' . $response->body());
            return false;
        } catch (\Exception $e) {
            Log::error('HyperSender Validation Error: ' . $e->getMessage());
            return false;
        }
    }
}
