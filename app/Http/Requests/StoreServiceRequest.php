<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreServiceRequest extends FormRequest
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
            'service_type' => 'required|string',
            'description' => 'required|string',
            'invoice_number' => 'required|string',
            'address' => 'required|string',
            'latitude' => 'required|numeric',
            'longitude' => 'required|numeric',
            'scheduled_at' => 'required|date',
            'end_date' => 'nullable|date|after_or_equal:scheduled_at',
            'images.*' => 'image|mimes:jpeg,png,jpg,gif|max:5120'
        ];
    }
}
