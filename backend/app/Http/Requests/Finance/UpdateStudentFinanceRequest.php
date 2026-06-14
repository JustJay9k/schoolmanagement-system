<?php

namespace App\Http\Requests\Finance;

use Illuminate\Foundation\Http\FormRequest;

class UpdateStudentFinanceRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->canManageFinance() ?? false;
    }

    protected function prepareForValidation(): void
    {
        $this->merge([
            'fees_balance' => $this->normalizeDecimal($this->input('fees_balance')),
            'books_paid' => $this->boolean('books_paid'),
            'uniform_paid' => $this->boolean('uniform_paid'),
        ]);
    }

    public function rules(): array
    {
        return [
            'fees_balance' => ['required', 'numeric', 'min:0'],
            'books_paid' => ['required', 'boolean'],
            'uniform_paid' => ['required', 'boolean'],
        ];
    }

    private function normalizeDecimal(mixed $value): float
    {
        if (is_string($value)) {
            $value = str_replace([',', ' '], '', trim($value));
        }

        return is_numeric($value) ? (float) $value : 0;
    }
}
