<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use App\Models\Rating;
use App\Models\ServiceRequest;
use App\Models\InstallationRequest;

class RatingSeeder extends Seeder
{
    /**
     * Run the database seeder.
     */
    public function run(): void
    {
        // Get completed service requests
        $completedServiceRequests = ServiceRequest::where('status', 'completed')
            ->limit(10)
            ->get();

        // Get completed installation requests
        $completedInstallationRequests = InstallationRequest::where('status', 'completed')
            ->limit(10)
            ->get();

        // Sample "How found us" options
        $howFoundUsOptions = [
            'Google Search',
            'Social Media',
            'Friend Recommendation',
            'Website',
            'Advertisement',
            'Previous Customer',
            'Walk-in',
        ];

        // Sample customer notes
        $customerNotes = [
            'Excellent service, very professional team!',
            'Great work, highly recommend!',
            'Good service but took longer than expected.',
            'Very satisfied with the installation quality.',
            'Professional and courteous technicians.',
            'Quick response and great customer service.',
            'Product quality is outstanding!',
            'Installation was done perfectly.',
            'Some minor issues but overall good.',
            'Exceeded my expectations!',
        ];

        // Create ratings for service requests
        foreach ($completedServiceRequests as $request) {
            Rating::create([
                'request_id' => $request->id,
                'request_type' => 'service',
                'user_id' => $request->user_id,
                'product_rating' => rand(3, 5),
                'service_rating' => rand(3, 5),
                'how_found_us' => $howFoundUsOptions[array_rand($howFoundUsOptions)],
                'customer_notes' => $customerNotes[array_rand($customerNotes)],
            ]);
        }

        // Create ratings for installation requests
        foreach ($completedInstallationRequests as $request) {
            Rating::create([
                'request_id' => $request->id,
                'request_type' => 'installation',
                'user_id' => $request->user_id,
                'product_rating' => rand(3, 5),
                'service_rating' => rand(4, 5),
                'how_found_us' => $howFoundUsOptions[array_rand($howFoundUsOptions)],
                'customer_notes' => $customerNotes[array_rand($customerNotes)],
            ]);
        }

        $this->command->info('Rating seeder completed successfully!');
    }
}
