<?php

namespace App\Services;

use App\Models\MediaFile;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\UploadedFile;

/**
 * Almacenamiento y registro de archivos (media_files, ADR-001).
 *
 * El archivo se guarda con nombre físico = sha256 + extensión (deduplicación
 * por hash) dentro de `directory` y se registra una fila en media_files.
 */
class MediaService
{
    public function storeFor(Model $model, UploadedFile $upload, array $options = []): MediaFile
    {
        $disk = $options['disk'] ?? 'local';
        $directory = trim((string) ($options['directory'] ?? ''), '/');
        $visibility = $options['visibility'] ?? 'private';

        if ($directory === '') {
            $directory = $this->defaultDirectory($model);
        }

        $hash = hash_file('sha256', $upload->getRealPath());
        $extension = strtolower($upload->getClientOriginalExtension() ?: ($upload->guessExtension() ?? ''));
        $mime = $upload->getMimeType() ?: 'application/octet-stream';
        $fileName = $hash . ($extension !== '' ? '.' . $extension : '');

        $storedPath = $upload->storeAs($directory, $fileName, [
            'disk' => $disk,
            'visibility' => $visibility,
        ]);

        [$width, $height] = $this->imageSize($upload);

        return MediaFile::create([
            'model_type' => $model->getMorphClass(),
            'model_id' => $model->getKey(),
            'disk' => $disk,
            'directory' => $directory,
            'file_name' => basename($storedPath),
            'extension' => $extension,
            'mime_type' => $mime,
            'file_type' => $this->fileType($mime),
            'file_size' => $upload->getSize(),
            'width' => $width,
            'height' => $height,
            'hash' => $hash,
            'visibility' => $visibility,
            'original_name' => $upload->getClientOriginalName(),
            'created_by' => $this->actorId(),
        ]);
    }

    public function defaultDirectory(Model $model): string
    {
        return $model->getTable() . '/' . $model->getKey();
    }

    /** @return array{0: int|null, 1: int|null} */
    private function imageSize(UploadedFile $upload): array
    {
        $mime = $upload->getMimeType() ?? '';

        if (! str_starts_with($mime, 'image/') || ! is_file($upload->getRealPath())) {
            return [null, null];
        }

        $raw = @getimagesize($upload->getRealPath());

        return $raw === false ? [null, null] : [$raw[0], $raw[1]];
    }

    private function fileType(string $mime): string
    {
        if (str_starts_with($mime, 'image/')) {
            return 'image';
        }

        $documentMimes = [
            'application/pdf',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'application/vnd.ms-excel',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        ];

        if (in_array($mime, $documentMimes, true)) {
            return 'document';
        }

        return 'other';
    }

    private function actorId(): int
    {
        return auth()->id() ?? (int) config('sertoco.system_user_id', 999999);
    }
}