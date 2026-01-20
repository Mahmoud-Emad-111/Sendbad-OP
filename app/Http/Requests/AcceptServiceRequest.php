<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class AcceptServiceRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return $this->user()->role === 'technician';
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'id' => [
                'required',
                'integer',
                Rule::exists('service_requests', 'id')->where(function ($query) {
                    return $query->where('technician_id', $this->user()->id)
                                 ->whereNull('technician_accepted_at');
                }),
            ],
        ];
    }

    public function messages()
    {
        return [
            'id.exists' => 'The request ID is invalid, not assigned to you, or already accepted.',
        ];
    }
}
