<?php

namespace App\Http\Requests\Guardian;

use Illuminate\Foundation\Http\FormRequest;

class SaveHomeworkSubmissionRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->isGuardian() && $this->user()->isActive();
    }

    /**
     * @return array<string, array<int, string>|string>
     */
    public function rules(): array
    {
        return [
            'answers' => ['nullable', 'array', 'max:20'],
            'answers.*.question_id' => ['required', 'integer'],
            'answers.*.answer' => ['required', 'string', 'min:1', 'max:2000'],
            'notes' => ['nullable', 'string', 'max:2000'],
            'attachments' => ['nullable', 'array', 'max:5'],
            'attachments.*' => [
                'file',
                'mimes:jpg,jpeg,png,gif,webp,pdf,doc,docx,xls,xlsx,csv,txt,ppt,pptx',
                'max:10240',
            ],
            'remove_attachment_ids' => ['nullable', 'array', 'max:10'],
            'remove_attachment_ids.*' => ['integer'],
        ];
    }

    public function messages(): array
    {
        return [
            'attachments.max' => 'You can attach up to 5 files.',
            'attachments.*.mimes' => 'Allowed file types: jpg, png, gif, webp, pdf, doc(x), xls(x), csv, txt, ppt(x).',
            'attachments.*.max' => 'Each attached file must be 10 MB or smaller.',
        ];
    }
}
