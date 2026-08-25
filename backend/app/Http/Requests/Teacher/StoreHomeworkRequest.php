<?php

namespace App\Http\Requests\Teacher;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Validator;

class StoreHomeworkRequest extends FormRequest
{
    public function authorize(): bool
    {
        $user = $this->user();

        return $user?->isTeacher() && $user->isActive();
    }

    public function rules(): array
    {
        return [
            'title' => ['required', 'string', 'max:180'],
            'description' => ['nullable', 'string', 'max:5000'],
            'due_date' => ['nullable', 'date'],
            'questions' => ['nullable', 'array', 'max:20'],
            'questions.*' => ['string', 'min:3', 'max:1000'],
            'attachments' => ['nullable', 'array', 'max:5'],
            'attachments.*' => [
                'file',
                'max:10240',
                'mimes:jpg,jpeg,png,gif,webp,pdf,doc,docx,xls,xlsx,csv,txt,ppt,pptx',
            ],
        ];
    }

    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $validator): void {
            $hasDescription = filled(trim((string) $this->input('description')));
            $hasQuestions = collect($this->input('questions', []))
                ->filter(fn ($question): bool => filled(trim((string) $question)))
                ->isNotEmpty();
            $hasAttachments = (bool) $this->hasFile('attachments');

            if (! $hasDescription && ! $hasQuestions && ! $hasAttachments) {
                $validator->errors()->add(
                    'questions',
                    'Add instructions, at least one question, or attach a document for this homework.',
                );
            }
        });
    }

    public function messages(): array
    {
        return [
            'questions.max' => 'Homework can hold at most 20 questions.',
            'questions.*.min' => 'Each question needs at least 3 characters.',
            'attachments.max' => 'Homework can hold at most 5 documents.',
            'attachments.*.max' => 'Each document must be 10MB or smaller.',
            'attachments.*.mimes' => 'Documents may be images (jpg, png, gif, webp) or files (pdf, doc, docx, xls, xlsx, csv, txt, ppt, pptx).',
        ];
    }
}
