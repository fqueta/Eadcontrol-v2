<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class TrackingEvent extends Model
{
    use HasFactory;

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'event_type',
        'phone',
        'url',
        'ip_address',
        'user_id',
        'resource_type',
        'resource_id',
        'metadata',
    ];

    /**
     * The attributes that should be cast.
     *
     * @var array<string, string>
     */
    protected $casts = [
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
        'metadata' => 'array',
    ];

    /**
     * Relationship to the user who triggered the event.
     */
    public function user()
    {
        return $this->belongsTo(User::class, 'user_id', 'id'); // Assuming user_id is string/uuid handled by model or DB
    }

    /**
     * Polymorphic relationship to the resource (Course, Activity, etc).
     */
    public function resource()
    {
        return $this->morphTo();
    }

    /**
     * Scope para filtrar por tipo de evento
     *
     * @param \Illuminate\Database\Eloquent\Builder $query
     * @param string $eventType
     * @return \Illuminate\Database\Eloquent\Builder
     */
    public function scopeByEventType($query, $eventType)
    {
        return $query->where('event_type', $eventType);
    }

    /**
     * Scope para ordenar por data de criação (mais recente primeiro)
     *
     * @param \Illuminate\Database\Eloquent\Builder $query
     * @return \Illuminate\Database\Eloquent\Builder
     */
    public function scopeLatest($query)
    {
        return $query->orderBy('created_at', 'desc');
    }
}