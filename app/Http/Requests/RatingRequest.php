<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class RatingRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return true; // Authorization handled in controller
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'product_rating' => 'required|integer|min:1|max:5',
            'service_rating' => 'required|integer|min:1|max:5',
            'how_found_us' => 'required|string|max:255',
            'customer_notes' => 'required|string|max:1000',
            'image' => 'required|image|mimes:jpeg,png,jpg,gif|max:5120', // 5MB
        ];
    }

    /**
     * Get custom messages for validator errors.
     *
     * @return array
     */
    public function messages(): array
    {
        return [
            'product_rating.integer' => 'Product rating must be a number',
            'product_rating.min' => 'Product rating must be at least 1',
            'product_rating.max' => 'Product rating must not exceed 5',
            'service_rating.integer' => 'Service rating must be a number',
            'service_rating.min' => 'Service rating must be at least 1',
            'service_rating.max' => 'Service rating must not exceed 5',
            'how_found_us.max' => 'How found us field must not exceed 255 characters',
            'customer_notes.max' => 'Customer notes must not exceed 1000 characters',
        ];
    }
}
