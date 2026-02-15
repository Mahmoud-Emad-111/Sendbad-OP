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
        Schema::create('request_activities', function (Blueprint $table) {
            $table->id();
            $table->morphs('request'); // request_id, request_type
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $table->string('action'); // status_updated, assigned, etc.
            $table->text('description')->nullable();
            $table->json('metadata')->nullable(); // For storing old/new values
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('request_activities');
    }
};
