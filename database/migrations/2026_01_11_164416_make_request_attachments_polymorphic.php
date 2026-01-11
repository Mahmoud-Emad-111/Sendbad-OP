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
        Schema::table('request_attachments', function (Blueprint $table) {
            $table->unsignedBigInteger('attachable_id')->nullable()->after('id');
            $table->string('attachable_type')->nullable()->after('attachable_id');
        });

        // Migrate existing data (assuming all are ServiceRequest)
        DB::table('request_attachments')->update([
            'attachable_type' => 'App\\Models\\ServiceRequest',
            'attachable_id' => DB::raw('service_request_id')
        ]);

        Schema::table('request_attachments', function (Blueprint $table) {
             // Drop foreign key first if it exists.
             // Note: Standard Laravel foreign key names are table_column_foreign.
             // request_attachments_service_request_id_foreign
            $table->dropForeign(['service_request_id']);
            $table->dropColumn('service_request_id');
        });
    }

    public function down(): void
    {
        Schema::table('request_attachments', function (Blueprint $table) {
             $table->foreignId('service_request_id')->nullable()->constrained()->onDelete('cascade');
        });

        DB::table('request_attachments')->where('attachable_type', 'App\\Models\\ServiceRequest')->update([
            'service_request_id' => DB::raw('attachable_id')
        ]);

        Schema::table('request_attachments', function (Blueprint $table) {
             $table->dropColumn(['attachable_id', 'attachable_type']);
        });
    }
};
