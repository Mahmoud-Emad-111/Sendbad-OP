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
     */
    public function getCustomerOrders(int $odooId, ?string $phone = null, ?string $name = null): array;

    /**
     * Check if a specific task exists for the user.
     * Task Name: "The product is complete and ready to be installed"
     */
    public function checkTaskReadiness(int $odooId): bool;

    /**
     * Get total debt (credit) for a customer from res.partner
     */
    public function getCustomerDebt(int $odooId): float;

    /**
     * Get Customer Invoices (account.move)
     */
    public function getCustomerInvoices(int $odooId, ?string $phone = null): array;
}
