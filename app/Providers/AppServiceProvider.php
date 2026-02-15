<?php

namespace App\Providers;

use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        $this->app->bind(
            \App\Services\Odoo\OdooIntegrationInterface::class,
            \App\Services\Odoo\OdooService::class
        );
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        \Illuminate\Database\Eloquent\Relations\Relation::morphMap([
            'service' => \App\Models\ServiceRequest::class,
            'installation' => \App\Models\InstallationRequest::class,
        ]);
    }
}
