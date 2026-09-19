<?php

namespace App\Http\Controllers\Platform\Media;

use App\Http\Controllers\Controller;
use App\Models\MediaFile;
use Illuminate\Support\Facades\Storage;

class MediaController extends Controller
{
    public function download(MediaFile $mediaFile)
    {
        abort_unless(Storage::disk($mediaFile->disk)->exists($mediaFile->path()), 404);

        return Storage::disk($mediaFile->disk)->download(
            $mediaFile->path(),
            $mediaFile->downloadName(),
        );
    }
}