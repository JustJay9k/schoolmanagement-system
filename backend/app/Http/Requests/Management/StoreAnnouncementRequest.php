<?php

namespace App\Http\Requests\Management;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Validator;

class StoreAnnouncementRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->canManageTimetables() ?? false;
    }

    public function rules(): array
    {
        return [
            'title' => ['required', 'string', 'max:180'],
            'body' => ['nullable', 'string', 'max:5000'],
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
            $hasBody = filled(trim((string) $this->input('body')));
            $hasAttachments = (bool) $this->hasFile('attachments');

            if (! $hasBody && ! $hasAttachments) {
                $validator->errors()->add(
                    'body',
                    'Write a message or attach at least one file for this announcement.',
                );
            }
        });
    }

    public function messages(): array
    {
        return [
            'attachments.max' => 'An announcement can hold at most 5 attachments.',
            'attachments.*.max' => 'Each attachment must be 10MB or smaller.',
            'attachments.*.mimes' => 'Attachments may be images (jpg, png, gif, webp) or documents (pdf, doc, docx, xls, xlsx, csv, txt, ppt, pptx).',
        ];
    }
}
