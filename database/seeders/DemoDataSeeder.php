<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use App\Models\User;
use App\Models\ServiceRequest;
use Carbon\Carbon;

class DemoDataSeeder extends Seeder
{
    public function run()
    {
        // 1. Create Technicians (10)
        $technicianIds = [];
        $techNames = [
            'Ahmed Hassan', 'Mohammed Ali', 'Ibrahim Sayed', 'Omar Khaled', 'Youssef Gamal',
            'Mostafa Mahmoud', 'Ali Hassan', 'Hassan Ibrahim', 'Khaled Omar', 'Gamal Youssef'
        ];

        foreach ($techNames as $index => $name) {
            $tech = User::create([
                'name' => $name,
                'email' => "tech{$index}@example.com",
                'phone' => "9689" . str_pad($index, 7, '0', STR_PAD_LEFT),
                'password' => Hash::make('password'),
                'role' => 'technician',
                'is_active' => true,
            ]);
            $technicianIds[] = $tech->id;
        }

        // 2. Create Customers (30)
        $customerIds = [];
        for ($i = 0; $i < 30; $i++) {
            $customer = User::create([
                'name' => "Customer " . ($i + 1),
                'email' => "customer{$i}@example.com",
                'phone' => "9687" . str_pad($i, 7, '0', STR_PAD_LEFT),
                'password' => Hash::make('password'),
                'role' => 'customer',
            ]);
            $customerIds[] = $customer->id;
        }

        // 3. Create Service Requests (~100)
        $serviceTypes = ['installation', 'maintenance', 'repair', 'inspection'];
        $addresses = [
            'Muscat, Mutrah', 'Muscat, Seeb', 'Muscat, Bawshar',
            'Salalah, Al Wusta', 'Sohar, Al Batinah', 'Nizwa, Ad Dakhiliyah'
        ];

        // A. Completed Requests (50) - Past Dates, Rated
        for ($i = 0; $i < 50; $i++) {
            $createdAt = Carbon::now()->subDays(rand(1, 30));
            $completedAt = (clone $createdAt)->addHours(rand(2, 48));

            ServiceRequest::create([
                'user_id' => $customerIds[array_rand($customerIds)],
                'technician_id' => $technicianIds[array_rand($technicianIds)],
                'service_type' => $serviceTypes[array_rand($serviceTypes)],
                'description' => 'Standard service request description for testing reports.',
                'address' => $addresses[array_rand($addresses)],
                'status' => 'completed',
                'rating' => rand(3, 5), // Mostly good ratings
                'review_comment' => rand(0, 1) ? 'Great service, thanks!' : null,
                'scheduled_at' => $createdAt,
                'completed_at' => $completedAt,
                'created_at' => $createdAt,
                'updated_at' => $completedAt,
                // Task timing (mock)
                'task_start_time' => (clone $completedAt)->subHours(2),
                'task_end_time' => $completedAt,
            ]);
        }

        // B. Pending Requests (20) - Future Dates
        for ($i = 0; $i < 20; $i++) {
            ServiceRequest::create([
                'user_id' => $customerIds[array_rand($customerIds)],
                'service_type' => $serviceTypes[array_rand($serviceTypes)],
                'description' => 'Future installation request.',
                'address' => $addresses[array_rand($addresses)],
                'status' => 'pending',
                'scheduled_at' => Carbon::now()->addDays(rand(1, 14)),
                'created_at' => Carbon::now(),
            ]);
        }

        // C. In Progress / Assigned (15) - Varied Deadlines
        for ($i = 0; $i < 15; $i++) {
            $isUrgent = ($i < 3); // 3 Urgent requests due TODAY

            $deadline = $isUrgent
                ? Carbon::now()->setTime(18, 0, 0) // Due today at 6 PM
                : Carbon::now()->addDays(rand(1, 5));

            ServiceRequest::create([
                'user_id' => $customerIds[array_rand($customerIds)],
                'technician_id' => $technicianIds[array_rand($technicianIds)],
                'service_type' => $serviceTypes[array_rand($serviceTypes)],
                'description' => $isUrgent ? 'URGENT: Maintenance needed immediately.' : 'Routine maintenance.',
                'address' => $addresses[array_rand($addresses)],
                'status' => rand(0, 1) ? 'assigned' : 'in_progress',
                'scheduled_at' => Carbon::now()->subHours(rand(1, 24)),
                'created_at' => Carbon::now()->subDays(1),
                'task_start_time' => Carbon::now()->subHours(rand(1, 4)), // Started recently
                'task_end_time' => $deadline, // Set Deadline
            ]);
        }
    }
}
