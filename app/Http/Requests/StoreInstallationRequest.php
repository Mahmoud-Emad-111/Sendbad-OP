<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreInstallationRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'product_type' => 'required|string',
            'quantity' => 'required|integer|min:1',
            'invoice_number' => 'required|string',
            'is_site_ready' => 'required|boolean',
            'readiness_details' => 'array', // Optional
            'notes' => 'nullable|string',
            'latitude' => 'required|numeric',
            'longitude' => 'required|numeric',
            'address' => 'nullable|string',
            'scheduled_at' => 'required|date',
            'end_date' => 'nullable|date|after_or_equal:scheduled_at',
            'images.*' => 'image|mimes:jpeg,png,jpg,gif|max:5120'
        ];
    }
}
