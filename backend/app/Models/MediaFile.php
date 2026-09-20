<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class MediaFile extends Model
{
    use HasFactory;

    protected $table = 'media_files';

    protected $fillable = [
        'user_id',
        'original_name',
        'storage_path',
        'hls_path',
        'public_url',
        'hls_url',
        'thumbnail_url',
        'mime_type',
        'size_bytes',
        'duration_seconds',
        'status',
        'linked_activity_id',
        'allow_download',
        'download_count',
        'config',
    ];

    protected $casts = [
        'config'         => 'array',
        'allow_download' => 'boolean',
        'size_bytes'     => 'integer',
        'duration_seconds' => 'integer',
        'download_count' => 'integer',
    ];

    /**
     * Vídeos não vinculados a nenhuma atividade (órfãos).
     */
    public function scopeOrphans($query)
    {
        return $query->whereNull('linked_activity_id');
    }

    /**
     * Vídeos vinculados a uma atividade.
     */
    public function scopeLinked($query)
    {
        return $query->whereNotNull('linked_activity_id');
    }

    /**
     * Filtra por status.
     */
    public function scopeByStatus($query, string $status)
    {
        return $query->where('status', $status);
    }

    /**
     * Retorna o tamanho formatado para exibição.
     */
    public function getFormattedSizeAttribute(): string
    {
        $bytes = $this->size_bytes ?? 0;
        if ($bytes === 0) return '0 B';
        $units = ['B', 'KB', 'MB', 'GB', 'TB'];
        $i = (int) floor(log($bytes, 1024));
        return round($bytes / pow(1024, $i), 2) . ' ' . ($units[$i] ?? 'B');
    }

    /**
     * Retorna a duração formatada (HH:MM:SS ou MM:SS).
     */
    public function getFormattedDurationAttribute(): string
    {
        $seconds = $this->duration_seconds ?? 0;
        if ($seconds <= 0) return '--:--';
        $h = intdiv($seconds, 3600);
        $m = intdiv($seconds % 3600, 60);
        $s = $seconds % 60;
        if ($h > 0) {
            return sprintf('%02d:%02d:%02d', $h, $m, $s);
        }
        return sprintf('%02d:%02d', $m, $s);
    }

    /**
     * URL de streaming efetiva: HLS se disponível, caso contrário a URL original.
     */
    public function getEffectiveStreamUrlAttribute(): string
    {
        return $this->hls_url ?: $this->public_url ?: '';
    }

    /**
     * Indica se está pronto para uso (HLS concluído).
     */
    public function getIsReadyAttribute(): bool
    {
        return $this->status === 'ready';
    }

    /**
     * Indica se é um vídeo órfão (não vinculado a atividade).
     */
    public function getIsOrphanAttribute(): bool
    {
        return is_null($this->linked_activity_id);
    }
}
