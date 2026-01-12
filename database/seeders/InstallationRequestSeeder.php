<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\InstallationRequest;
use App\Models\User;
use Carbon\Carbon;

class InstallationRequestSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $customers = User::where('role', 'customer')->get();
        $technicians = User::where('role', 'technician')->get();

        if ($customers->isEmpty()) {
            $this->command->info('No customers found, skipping installation requests seeding.');
            return;
        }

        $productTypes = ['Aluminum Kitchen', 'Bedroom Wardrobe', 'Glass Facade', 'Smart Door System', 'Office Partition'];
        $addresses = [
            ['lat' => 24.7136, 'lng' => 46.6753, 'addr' => 'Riyadh, Olaya St'],
            ['lat' => 21.4858, 'lng' => 39.1925, 'addr' => 'Jeddah, Corniche'],
            ['lat' => 24.774265, 'lng' => 46.738586, 'addr' => 'Riyadh, Airport Rd'],
            ['lat' => 26.4207, 'lng' => 50.0888, 'addr' => 'Dammam, King Fahd Rd'],
        ];

        foreach ($customers as $customer) {
            // Create 1-3 requests per customer
            $count = rand(1, 3);

            for ($i = 0; $i < $count; $i++) {
                $status = fake()->randomElement(['pending', 'assigned', 'in_progress', 'completed', 'canceled']);
                $technicianId = ($status !== 'pending') && $technicians->isNotEmpty() ? $technicians->random()->id : null;
                $location = fake()->randomElement($addresses);
                $date = fake()->dateTimeBetween('-1 month', '+1 week');

                InstallationRequest::create([
                    'user_id' => $customer->id,
                    'technician_id' => $technicianId,
                    'product_type' => fake()->randomElement($productTypes),
                    'quantity' => rand(1, 5),
                    'is_site_ready' => fake()->boolean(70),
                    'readiness_details' => [
                        'ceramic' => fake()->boolean(),
                        'painting' => fake()->boolean(),
                        'electricity' => fake()->boolean()
                    ],
                    'notes' => fake()->sentence(),
                    'latitude' => $location['lat'] + (rand(-100, 100) / 10000), // Slight variation
                    'longitude' => $location['lng'] + (rand(-100, 100) / 10000),
                    'address' => $location['addr'],
                    'scheduled_at' => $date,
                    'status' => $status,
                    'created_at' => $date,
                    'updated_at' => $date,
                ]);
            }
        }
    }
}
