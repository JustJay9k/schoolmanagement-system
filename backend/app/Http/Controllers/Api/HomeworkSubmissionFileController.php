<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\HomeworkSubmissionAttachment;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\Response;

class HomeworkSubmissionFileController extends Controller
{
    public function __invoke(HomeworkSubmissionAttachment $attachment): Response
    {
        $disk = Storage::disk('public');

        abort_unless($disk->exists($attachment->file_path), 404);

        return $disk->response($attachment->file_path, $attachment->original_name, [
            'Cache-Control' => 'private, max-age=21600',
        ]);
    }
}
