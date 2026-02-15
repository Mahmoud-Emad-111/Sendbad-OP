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
        Schema::create('request_technician_images', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('request_id');
            $table->enum('request_type', ['service', 'installation']);
            $table->unsignedBigInteger('technician_id');
            $table->string('image_path');
            $table->text('notes')->nullable();
            $table->timestamps();

            // Indexes for performance
            $table->index(['request_id', 'request_type']);
            $table->index('technician_id');

            // Foreign key
            $table->foreign('technician_id')
                  ->references('id')
                  ->on('users')
                  ->onDelete('cascade');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('request_technician_images');
    }
};
