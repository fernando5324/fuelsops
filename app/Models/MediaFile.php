<?php

namespace App\Models;

use App\Models\Concerns\Auditable;
use App\Models\Concerns\LogicalDelete;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\MorphTo;

/**
 * Repositorio central de archivos del sistema (ADR-001).
 * El archivo físico se guarda en el disco indicado por `disk` dentro de
 * `directory`; `file_name` es el nombre físico (hash + extensión).
 */
class MediaFile extends Model
{
    use Auditable, LogicalDelete;

    protected $table = 'media_files';

    protected $fillable = [
        'model_type',
        'model_id',
        'disk',
        'directory',
        'file_name',
        'extension',
        'mime_type',
        'file_type',
        'file_size',
        'width',
        'height',
        'hash',
        'visibility',
        'original_name',
    ];

    protected $casts = [
        'file_size' => 'integer',
        'width' => 'integer',
        'height' => 'integer',
    ];

    public function model(): MorphTo
    {
        return $this->morphTo();
    }

    /** Ruta relativa completa dentro del disco: directory/file_name */
    public function path(): string
    {
        return trim((string) $this->directory, '/') . '/' . $this->file_name;
    }

    /** Nombre razonable para descargas (el original si existe). */
    public function downloadName(): string
    {
        return $this->original_name ?: $this->file_name;
    }
}