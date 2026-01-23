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
        Schema::create('ratings', function (Blueprint $table) {
            $table->id();

            // Link to request (polymorphic: service_request or installation_request)
            $table->unsignedBigInteger('request_id');
            $table->string('request_type'); // 'service' or 'installation'

            // User who submitted the rating
            $table->foreignId('user_id')->constrained()->onDelete('cascade');

            // Rating fields
            $table->tinyInteger('product_rating')->nullable()->comment('1-5 stars for product satisfaction');
            $table->tinyInteger('service_rating')->nullable()->comment('1-5 stars for service/installation satisfaction');
            $table->string('how_found_us')->nullable()->comment('How customer found us');
            $table->text('customer_notes')->nullable()->comment('Customer feedback/notes');

            $table->timestamps();

            // Unique constraint: one rating per request
            $table->unique(['request_id', 'request_type']);

            // Index for quick lookups
            $table->index(['request_id', 'request_type']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('ratings');
    }
};
