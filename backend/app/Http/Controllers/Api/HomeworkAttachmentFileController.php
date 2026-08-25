<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\HomeworkAttachment;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\Response;

class HomeworkAttachmentFileController extends Controller
{
    public function __invoke(HomeworkAttachment $attachment): Response
    {
        $disk = Storage::disk('public');

        abort_unless($disk->exists($attachment->file_path), 404);

        return $disk->response($attachment->file_path, $attachment->original_name, [
            'Cache-Control' => 'private, max-age=21600',
        ]);
    }
}
