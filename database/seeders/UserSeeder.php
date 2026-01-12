<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\User;
use Illuminate\Support\Facades\Hash;

class UserSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $email = env('ADMIN_EMAIL', 'admin@example.com');

        $user = User::firstOrNew(['email' => $email]);
        $user->name = env('ADMIN_NAME', 'Administrator');
        $user->email_verified_at = now();
        $user->password = Hash::make(env('ADMIN_PASSWORD', 'password'));
        $user->phone = env('ADMIN_PHONE', '+10000000000');
        $user->role = 'admin';
        $user->save();
    }
}
