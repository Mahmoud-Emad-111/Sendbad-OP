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
        Schema::create('manual_orders', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('invoice_number');
            $table->string('quotation_template')->nullable();
            $table->decimal('total_amount', 10, 3)->default(0);
            $table->decimal('paid_amount', 10, 3)->default(0);
            $table->decimal('remaining_amount', 10, 3)->default(0);
            $table->string('status')->default('partial'); // paid, partial
            $table->date('order_date')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('manual_orders');
    }
};
