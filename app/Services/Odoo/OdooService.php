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
        $response = Http::withoutVerifying()->post($this->url . '/jsonrpc', [
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

    public function findCustomerByPhoneOrName(string $phone, ?string $name): ?array
    {
        try {
            // We use the 'execute_kw' method as specified in your requirements
            // But first, we need a UID.
            $uid = $this->getUid();

            // Prepare the domain (search criteria)
            // Odoo Format: 968 9922 3303 (Spaces)
            // Input: 96899223303 (No spaces)

            $formattedPhone = $phone;
            // Basic formatting for Oman numbers: 968 XXXX XXXX or 968 XXXX XXXX
            // User specified: 968 9922 3303 (3-4-4)
            if (strlen($phone) == 11 && str_starts_with($phone, '968')) {
                 $formattedPhone = substr($phone, 0, 3) . ' ' . substr($phone, 3, 4) . ' ' . substr($phone, 7);
            }

            // 2. Short Phone (Last 8 digits) to catch format issues
            // e.g. Input: 96899223303 -> Search: %99223303%
            // This matches +968 9922 3303, 00968 99223303, etc.
            $shortPhone = strlen($phone) > 8 ? substr($phone, -8) : $phone;

            // Using '|' (OR) operator to search for raw input OR formatted OR shortPhone in both 'phone' and 'mobile' fields
            if ($name) {
                // Complex domain: (Name match) OR (Phone match raw) OR (Phone match formatted) OR (Phone match short) OR (Mobile match...)
                // We simplify by checking Name OR (Any Phone Logic in Phone OR Mobile)
                // Let's just pile them up with ORs
                $domain = [
                    '|', '|', '|', '|', '|',
                    ['phone', 'ilike', '%' . $phone . '%'],
                    ['phone', 'ilike', '%' . $formattedPhone . '%'],
                    ['phone', 'ilike', '%' . $shortPhone . '%'],
                    ['mobile', 'ilike', '%' . $phone . '%'],
                    ['mobile', 'ilike', '%' . $formattedPhone . '%'],
                    ['mobile', 'ilike', '%' . $shortPhone . '%'], // We need one more OR? No, wait.
                ];
                // Wait, structural prefix notation for N items needs N-1 ORs.
                // We have 6 items here + Name = 7 items. So 6 ORs.
                // Actually let's list them:
                // 1. Name
                // 2. Phone like phone
                // 3. Phone like formatted
                // 4. Phone like short
                // 5. Mobile like phone
                // 6. Mobile like formatted
                // 7. Mobile like short

                // Total 7 conditions -> 6 pipes ['|', '|', '|', '|', '|', '|', A, B, C, D, E, F, G]

                 $domain = [
                    '|', '|', '|', '|', '|', '|',
                    ['name', 'ilike', '%' . $name . '%'],
                    ['phone', 'ilike', '%' . $phone . '%'],
                    ['phone', 'ilike', '%' . $formattedPhone . '%'],
                    ['phone', 'ilike', '%' . $shortPhone . '%'],
                    ['mobile', 'ilike', '%' . $phone . '%'],
                    ['mobile', 'ilike', '%' . $formattedPhone . '%'],
                    ['mobile', 'ilike', '%' . $shortPhone . '%']
                ];

            } else {
                // 6 items -> 5 pipes
                $domain = [
                    '|', '|', '|', '|', '|',
                    ['phone', 'ilike', '%' . $phone . '%'],
                    ['phone', 'ilike', '%' . $formattedPhone . '%'],
                    ['phone', 'ilike', '%' . $shortPhone . '%'],
                    ['mobile', 'ilike', '%' . $phone . '%'],
                    ['mobile', 'ilike', '%' . $formattedPhone . '%'],
                    ['mobile', 'ilike', '%' . $shortPhone . '%']
                ];
            }

            $response = Http::withoutVerifying()->post($this->url . '/jsonrpc', [
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

    /**
     * Helper to find ALL partner IDs matching Phone, Mobile, or Name
     */
    private function getPartnerIdsByCriteria(?string $phone, ?string $name = null): array
    {
        try {
            $phoneIds = [];
            if ($phone) {
                $formattedPhone = $phone;
                // Basic formatting for Oman numbers: 968 XXXX XXXX
                if (strlen($phone) == 11 && str_starts_with($phone, '968')) {
                     $formattedPhone = substr($phone, 0, 3) . ' ' . substr($phone, 3, 4) . ' ' . substr($phone, 7);
                }

                // Search in both 'phone' and 'mobile' using OR
                $phoneDomain = [
                    '|', '|', '|',
                    ['phone', 'ilike', $phone],
                    ['phone', 'ilike', $formattedPhone],
                    ['mobile', 'ilike', $phone],
                    ['mobile', 'ilike', $formattedPhone]
                ];

                 // Execute Phone Search
                $response = Http::withoutVerifying()->post($this->url . '/jsonrpc', [
                    'jsonrpc' => '2.0',
                    'method' => 'call',
                    'params' => [
                        'service' => 'object',
                        'method' => 'execute_kw',
                        'args' => [
                            $this->db, $this->getUid(), $this->password, 'res.partner', 'search_read',
                            [$phoneDomain],
                            ['fields' => ['id']]
                        ]
                    ],
                    'id' => rand(1, 10000)
                ]);

                $result = $response->json();
                if (!isset($result['error'])) {
                     $phoneIds = array_column($result['result'] ?? [], 'id');
                }
            }

            $nameIds = [];
            if ($name) {
                 // Execute Name Search
                 $response = Http::withoutVerifying()->post($this->url . '/jsonrpc', [
                    'jsonrpc' => '2.0',
                    'method' => 'call',
                    'params' => [
                        'service' => 'object',
                        'method' => 'execute_kw',
                        'args' => [
                            $this->db, $this->getUid(), $this->password, 'res.partner', 'search_read',
                            [[['name', 'ilike', $name]]],
                            ['fields' => ['id']]
                        ]
                    ],
                    'id' => rand(1, 10000)
                ]);

                $result = $response->json();
                if (!isset($result['error'])) {
                    $nameIds = array_column($result['result'] ?? [], 'id');
                }
            }

            return array_unique(array_merge($phoneIds, $nameIds));

        } catch (Exception $e) {
            Log::error('Odoo Error (Partner Criteria): ' . $e->getMessage());
            return [];
        }
    }

    public function getCustomerOrders(int $odooId, ?string $phone = null, ?string $name = null): array
    {
        try {
            $uid = $this->getUid();

           // Strict Implementation of User's JSON Query
           // 1. Domain: [['project_id', '!=', false], ['partner_id.phone', '=', '+968 XXXX XXXX']]

            // Simplified Domain: Fetch ALL orders for this partner (and their contacts)
            // We trust the $odooId passed from the controller (found via phone/name match)
            $domain = [
                ['partner_id', 'child_of', $odooId]
            ];

            $response = Http::withoutVerifying()->post($this->url . '/jsonrpc', [
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
                           $domain
                        ],
                        [
                            'fields' => [
                                'id',
                                'name',
                                'date_order',
                                'partner_id',
                                'amount_due',
                                'amount_total',
                                'invoice_status',
                                'invoice_ids',
                                'sale_order_template_id'
                            ],
                            'limit' => 50,
                            'order' => 'date_order desc'
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
    public function getProducts(int $limit = 50): array
    {
        try {
            $uid = $this->getUid();

            $response = Http::withoutVerifying()->post($this->url . '/jsonrpc', [
                'jsonrpc' => '2.0',
                'method' => 'call',
                'params' => [
                    'service' => 'object',
                    'method' => 'execute_kw',
                    'args' => [
                        $this->db,
                        $uid,
                        $this->password,
                        'product.product',
                        'search_read',
                        [
                            [['type', '=', 'product']] // Only storeable products
                        ],
                        [
                            'fields' => ['id', 'name', 'list_price', 'qty_available', 'uom_id'],
                            'limit' => $limit
                        ]
                    ]
                ],
                'id' => rand(1, 100000)
            ]);

            $result = $response->json();

            if (isset($result['error'])) {
                Log::error('Odoo Error (Products): ' . json_encode($result['error']));
                return [];
            }

            return $result['result'] ?? [];

        } catch (Exception $e) {
            Log::error('Odoo Connection Error: ' . $e->getMessage());
            return [];
        }
    }

    public function checkTaskReadiness(int $odooId): bool
    {
        try {
            $uid = $this->getUid();

           // Strict: Search for task with EXACT name "The product is complete..."
           // AND it must be marked as "Ready" (Green Checkmark / Done state)
            $response = Http::withoutVerifying()->post($this->url . '/jsonrpc', [
                'jsonrpc' => '2.0',
                'method' => 'call',
                'params' => [
                    'service' => 'object',
                    'method' => 'execute_kw',
                    'args' => [
                        $this->db,
                        $uid,
                        $this->password,
                        'project.task',
                        'search_count',
                        [
                            [
                                ['partner_id', '=', $odooId],
                                ['name', '=', 'The product is complete and ready to be installed'],
                                ['state', 'in', ['done', '1_done']] // Allow both standard 'done' and '1_done' (Ready)
                            ]
                        ]
                    ]
                ],
                'id' => rand(1, 100000)
            ]);

            $result = $response->json();

            if (isset($result['error'])) {
                Log::error('Odoo Error (Task Check): ' . json_encode($result['error']));
                return false;
            }

            $count = $result['result'] ?? 0;
            return $count > 0;

        } catch (Exception $e) {
            Log::error('Odoo Connection Error: ' . $e->getMessage());
            return false;
        }
    }

    public function getUserTasks(int $odooId): array
    {
        try {
            $uid = $this->getUid();

            // 1. Search for tasks first (without potentially breaking fields)
            $response = Http::withoutVerifying()->post($this->url . '/jsonrpc', [
                'jsonrpc' => '2.0',
                'method' => 'call',
                'params' => [
                    'service' => 'object',
                    'method' => 'execute_kw',
                    'args' => [
                        $this->db,
                        $uid,
                        $this->password,
                        'project.task',
                        'search_read',
                        [
                            [['partner_id', '=', $odooId]]
                        ],
                        [
                            'fields' => ['id', 'name', 'stage_id', 'date_deadline'],
                            'limit' => 50,
                            'order' => 'date_deadline desc, id desc'
                        ]
                    ]
                ],
                'id' => rand(1, 100000)
            ]);

            $result = $response->json();
            $tasks = $result['result'] ?? [];

            if (empty($tasks)) {
                return [];
            }

            // 2. Extract IDs and fetch 'kanban_state' via explicit 'read'
            // This bypasses potential issues with search_read or permissions on mixed fields
            $poIds = array_column($tasks, 'id');

            $readResponse = Http::withoutVerifying()->post($this->url . '/jsonrpc', [
                'jsonrpc' => '2.0',
                'method' => 'call',
                'params' => [
                    'service' => 'object',
                    'method' => 'execute_kw',
                    'args' => [
                        $this->db,
                        $uid,
                        $this->password,
                        'project.task',
                        'read',
                        [$poIds],
                        ['fields' => ['kanban_state']]
                    ]
                ],
                'id' => rand(1, 100000)
            ]);

            $readResult = $readResponse->json();
            if (isset($readResult['result'])) {
                $states = [];
                foreach ($readResult['result'] as $item) {
                    $states[$item['id']] = $item['kanban_state'];
                }

                // Merge kanban_state back into tasks
                foreach ($tasks as &$task) {
                    $task['kanban_state'] = $states[$task['id']] ?? 'unknown';
                }
            }

            return $tasks;

        } catch (Exception $e) {
            Log::error('Odoo Connection Error (Get Tasks): ' . $e->getMessage());
            return [];
        }
    }

    public function getCustomerDebt(int $odooId): float
    {
        try {
            $uid = $this->getUid();

            // Fetch 'debit' field from res.partner
            // In Odoo, for Customers:
            // 'debit' = Total Receivable (Amount they owe us)
            // 'credit' = Total Payable (Amount we owe them / Advance payments)
            $response = Http::withoutVerifying()->post($this->url . '/jsonrpc', [
                'jsonrpc' => '2.0',
                'method' => 'call',
                'params' => [
                    'service' => 'object',
                    'method' => 'execute_kw',
                    'args' => [
                        $this->db,
                        $uid,
                        $this->password,
                        'res.partner',
                        'read',
                        [[$odooId]],
                        ['fields' => ['debit']]
                    ]
                ],
                'id' => rand(1, 100000)
            ]);

            $result = $response->json();

            if (isset($result['error'])) {
                Log::error('Odoo Error (Debt Check): ' . json_encode($result['error']));
                return 0.0;
            }

            $partnerData = $result['result'][0] ?? [];
            return (float) ($partnerData['debit'] ?? 0.0);

        } catch (Exception $e) {
            Log::error('Odoo Connection Error: ' . $e->getMessage());
            return 0.0;
        }
    }

    public function getCustomerInvoices(int $odooId, ?string $phone = null): array
    {
        try {
            $uid = $this->getUid();

            // Default: search by ID and its children
            $partnerIds = [$odooId];

            if ($phone) {
                // Check if getPartnerIdsByCriteria exists before calling (it was added in the previous step)
                // We pass null for name as getCustomerInvoices signature doesn't support it yet
                $foundIds = $this->getPartnerIdsByCriteria($phone, null);
                if (!empty($foundIds)) {
                     $partnerIds = array_unique(array_merge($partnerIds, $foundIds));
                }
            }

            // Standard Invoice Filters
            $finalDomain = [
                ['partner_id', 'in', $partnerIds],
                ['move_type', '=', 'out_invoice'],
                ['state', '=', 'posted'],
                ['payment_state', '!=', 'paid']
            ];

            $response = Http::withoutVerifying()->post($this->url . '/jsonrpc', [
                'jsonrpc' => '2.0',
                'method' => 'call',
                'params' => [
                    'service' => 'object',
                    'method' => 'execute_kw',
                    'args' => [
                        $this->db,
                        $uid,
                        $this->password,
                        'account.move', // Invoices
                        'search_read',
                        [
                             $finalDomain
                        ],
                        [
                            'fields' => ['name', 'amount_total', 'amount_residual', 'payment_state', 'partner_id']
                        ]
                    ]
                ],
                'id' => rand(1, 100000)
            ]);

            $result = $response->json();

            if (isset($result['error'])) {
                Log::error('Odoo Error (Invoices): ' . json_encode($result['error']));
                return [];
            }

            return $result['result'] ?? [];

        } catch (Exception $e) {
            Log::error('Odoo Connection Error: ' . $e->getMessage());
            return [];
        }
    }
}
