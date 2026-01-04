<?php

namespace App\Services\Odoo;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Exception;

class OdooService implements OdooIntegrationInterface
{
    protected string $url;
    protected string $db;
    protected string $username;
    protected string $password;
    protected int $uid;

    public function __construct()
    {
        $this->url = config('odoo.url') ?? '';
        $this->db = config('odoo.db') ?? '';
        $this->username = config('odoo.username') ?? '';
        $this->password = config('odoo.password') ?? '';

        if (empty($this->username) || empty($this->password)) {
           // We allow empty construction but methods should check
           // OR we throw specific exception:
           // throw new Exception("Odoo credentials (ODOO_USERNAME, ODOO_PASSWORD) are missing in .env");
        }
    }

    /**
     * Authenticate and get UID (Helper method)
     */
    protected function getUid(): int
    {
        if (!empty($this->uid)) {
            return $this->uid;
        }

        // Ideally cache this UID
        $response = Http::post($this->url . '/jsonrpc', [
            'jsonrpc' => '2.0',
            'method' => 'call',
            'params' => [
                'service' => 'common',
                'method' => 'login',
                'args' => [
                    $this->db,
                    $this->username,
                    $this->password,
                ],
            ],
            'id' => time(),
        ]);

        $result = $response->json();

        if (isset($result['result']) && is_int($result['result'])) {
            return $this->uid = $result['result'];
        }

        throw new Exception('Odoo Authentication Failed: ' . json_encode($result));
    }

    public function findCustomerByPhone(string $phone): ?array
    {
        try {
            // We use the 'execute_kw' method as specified in your requirements
            // But first, we need a UID.
            $uid = $this->getUid();

            // Prepare the domain (search criteria)
            // Note: Odoo phone numbers can be messy.
            // We search exactly as provided for now, but in production, we might need normalization.
            $domain = [
                // ['sale_order_ids', '!=', false], // Temporarily disabled
                ['phone', 'ilike', $phone]
            ];

            $response = Http::post($this->url . '/jsonrpc', [
                'jsonrpc' => '2.0',
                'method' => 'call',
                'params' => [
                    'service' => 'object',
                    'method' => 'execute_kw',
                    'args' => [
                        $this->db,
                        $uid,
                        $this->password, // Password is used in execute_kw for authentication context
                        'res.partner',
                        'search_read',
                        [$domain],
                        [
                            'fields' => ['id', 'name', 'phone'],
                            'limit' => 1 // We only need one match to validate
                        ]
                    ]
                ],
                // ID should be an integer
                 'id' => rand(1, 100000)
            ]);

            $result = $response->json();

            if (isset($result['error'])) {
                Log::error('Odoo Error: ' . json_encode($result['error']));
                return null;
            }

            $partners = $result['result'] ?? [];

            if (!empty($partners)) {
                return $partners[0]; // Return the first matching customer
            }

            return null;

        } catch (Exception $e) {
            Log::error('Odoo Connection Error: ' . $e->getMessage());
            return null;
        }
    }

    public function getCustomerOrders(int $odooId): array
    {
        try {
            $uid = $this->getUid();

           $response = Http::post($this->url . '/jsonrpc', [
                'jsonrpc' => '2.0',
                'method' => 'call',
                'params' => [
                    'service' => 'object',
                    'method' => 'execute_kw',
                    'args' => [
                        $this->db,
                        $uid,
                        $this->password,
                        'sale.order',
                        'search_read',
                        [
                            [['partner_id', '=', $odooId]]
                        ],
                        [
                            'fields' => ['amount_total', 'date_order', 'amount_due']
                        ]
                    ]
                ],
                'id' => rand(1, 100000)
            ]);

            $result = $response->json();

            if (isset($result['error'])) {
                Log::error('Odoo Error (Orders): ' . json_encode($result['error']));
                return [];
            }

            return $result['result'] ?? [];

        } catch (Exception $e) {
            Log::error('Odoo Connection Error: ' . $e->getMessage());
            return [];
        }
    }
}
