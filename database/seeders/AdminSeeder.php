<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use App\Models\User;

class AdminSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Check if admin already exists
        if (!User::where('phone', '96812345678')->exists()) {
            User::create([
                'name' => 'Admin User',
                'phone' => '96812345678',
                'password' => Hash::make('password'),
                'role' => 'admin',
                'is_active' => true,
                'email' => 'admin@sindbad.com'
            ]);
            $this->command->info('Admin Account Created! Phone: 96812345678 | Pass: password');
        } else {
            $this->command->warn('Admin Account already exists.');
        }
    }
}
