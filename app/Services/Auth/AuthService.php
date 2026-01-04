<?php

namespace App\Services\Auth;

use App\Models\User;
use App\Services\Odoo\OdooIntegrationInterface;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class AuthService
{
    protected OdooIntegrationInterface $odoo;

    public function __construct(OdooIntegrationInterface $odoo)
    {
        $this->odoo = $odoo;
    }

    /**
     * Step 1: Validate if the user exists in Odoo and is eligible.
     */
    public function validateOdooUser(string $phone): array
    {
        $customer = $this->odoo->findCustomerByPhone($phone);

        if (!$customer) {
            throw ValidationException::withMessages([
                'phone' => ['رقم الهاتف غير مسجل أو ليس لديه طلبات سابقة في النظام.']
            ]);
        }

        return $customer;
    }

    /**
     * Step 2: Activate account / Set Password
     */
    public function activateUser(string $phone, string $password, int $odooId, string $name)
    {
        // Calculate or Check if user already exists
        $user = User::where('phone', $phone)->first();

        if ($user && $user->is_active) {
            throw ValidationException::withMessages([
                'phone' => ['هذا الحساب مفعل بالفعل، يرجى تسجيل الدخول.']
            ]);
        }

        // Create or Update
        $user = User::updateOrCreate(
            ['phone' => $phone],
            [
                'name' => $name,
                'email' => null, // Email is optional in this flow, or can be fetched from Odoo
                'password' => Hash::make($password),
                'odoo_id' => $odooId,
                'is_active' => true,
                // 'role' => 'customer' // Assuming we add a role column later
            ]
        );

        // Create Token
        return $user->createToken('auth_token')->plainTextToken;
    }
}
