<?php

namespace App\Services\Odoo;

interface OdooIntegrationInterface
{
    /**
     * Search for a customer in Odoo by phone number.
     * Must return the customer ID, Name, and Phone if found and has orders.
     *
     * @param string $phone
     * @return array|null
     */
    public function findCustomerByPhone(string $phone): ?array;

    /**
     * Get customer orders and financial status from Odoo.
     *
     * @param int $odooId
     * @return array
     */
    public function getCustomerOrders(int $odooId): array;
}
