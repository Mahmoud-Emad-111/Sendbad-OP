<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('installation_requests', function (Blueprint $table) {
            $table->timestamp('technician_accepted_at')->nullable()->after('status');
        });

        Schema::table('service_requests', function (Blueprint $table) {
            $table->timestamp('technician_accepted_at')->nullable()->after('status');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('installation_requests', function (Blueprint $table) {
            $table->dropColumn('technician_accepted_at');
        });

        Schema::table('service_requests', function (Blueprint $table) {
            $table->dropColumn('technician_accepted_at');
        });
    }
};
