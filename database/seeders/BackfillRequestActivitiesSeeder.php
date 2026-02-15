<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\ServiceRequest;
use App\Models\InstallationRequest;
use App\Models\RequestActivity;

class BackfillRequestActivitiesSeeder extends Seeder
{
    public function run()
    {
        $this->backfill(ServiceRequest::class);
        $this->backfill(InstallationRequest::class);
    }

    private function backfill($modelClass)
    {
        $requests = $modelClass::whereDoesntHave('activities', function ($query) {
            $query->where('action', 'created');
        })->get();

        foreach ($requests as $request) {
            RequestActivity::create([
                'request_id' => $request->id,
                'request_type' => $request->getMorphClass(),
                'user_id' => $request->user_id, // Assume the creator is the user
                'action' => 'created',
                'description' => $modelClass === ServiceRequest::class ? 'تم إنشاء طلب الصيانة' : 'تم إنشاء طلب التركيب',
                'metadata' => ['status' => 'pending'],
                'created_at' => $request->created_at,
                'updated_at' => $request->created_at,
            ]);
        }
    }
}
