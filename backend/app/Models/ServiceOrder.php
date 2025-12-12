<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use App\Traits\ObjectMapping;

class ServiceOrder extends Model
{
    use HasFactory, SoftDeletes, ObjectMapping;

    /**
     * The attributes that are mass assignable.
     */
    protected $fillable = [
        'title',
        'doc_type',
        'description',
        'object_id',
        'object_type',
        'assigned_to',
        'client_id',
        'status',
        'priority',
        'estimated_start_date',
        'estimated_end_date',
        'actual_start_date',
        'actual_end_date',
        'notes',
        'token',
        'config',
        'internal_notes',
        'total_amount',
    ];

    /**
     * The attributes that should be cast.
     */
    protected $casts = [
        'estimated_start_date' => 'date',
        'estimated_end_date' => 'date',
        'actual_start_date' => 'date',
        'actual_end_date' => 'date',
        'total_amount' => 'decimal:2',
        'config' => 'array',
    ];

    /**
     * Get the items for the service order.
     */
    public function items(): HasMany
    {
        return $this->hasMany(ServiceOrderItem::class);
    }

    /**
     * Get the products for the service order.
     */
    public function products(): HasMany
    {
        return $this->hasMany(ServiceOrderItem::class)->where('item_type', 'product');
    }

    /**
     * Get the services for the service order.
     */
    public function services(): HasMany
    {
        return $this->hasMany(ServiceOrderItem::class)->where('item_type', 'service');
    }

    /**
     * Get the object that owns the service order (polymorphic relationship).
     */
    public function object()
    {
        switch ($this->object_type) {
            case 'aircraft':
                return $this->belongsTo(Aircraft::class, 'object_id');
            default:
                return null;
        }
    }

    /**
     * Get the aircraft when object_type is 'aircraft'.
     */
    public function aircraft(): BelongsTo
    {
        return $this->belongsTo(Aircraft::class, 'object_id');
    }

    /**
     * Get the client that owns the service order.
     */
    public function client(): BelongsTo
    {
        return $this->belongsTo(Client::class);
    }

    /**
     * Get the user assigned to the service order.
     */
    public function assignedUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'assigned_to');
    }

    /**
     * Calculate and update the total amount based on items.
     */
    public function calculateTotalAmount(): void
    {
        $total = $this->items()->sum('total_price');
        $this->update(['total_amount' => $total]);
    }

    /**
     * Scope a query to only include orders with a specific status.
     */
    public function scopeStatus($query, $status)
    {
        return $query->where('status', $status);
    }

    /**
     * Scope a query to only include orders with a specific priority.
     */
    public function scopePriority($query, $priority)
    {
        return $query->where('priority', $priority);
    }

    /**
     * Scope a query to only include orders assigned to a specific user.
     */
    public function scopeAssignedTo($query, $userId)
    {
        return $query->where('assigned_to', $userId);
    }

    /**
     * Scope a query to only include orders for a specific object type.
     */
    public function scopeObjectType($query, $objectType)
    {
        return $query->where('object_type', $objectType);
    }

    /**
     * Scope a query to only include orders for a specific object.
     */
    public function scopeForObject($query, $objectId, $objectType = null)
    {
        $query->where('object_id', $objectId);
        if ($objectType) {
            $query->where('object_type', $objectType);
        }
        return $query;
    }

    /**
     * Get the status options.
     */
    public static function getStatusOptions(): array
    {
        return [
            'draft' => 'Rascunho',
            'pending' => 'Pendente',
            'in_progress' => 'Em Andamento',
            'completed' => 'Concluída',
            'cancelled' => 'Cancelada',
            'on_hold' => 'Em Espera',
            'approved' => 'Aprovada',
            'rejected' => 'Rejeitada',
        ];
    }

    /**
     * Get the priority options.
     */
    public static function getPriorityOptions(): array
    {
        return [
            'low' => 'Baixa',
            'medium' => 'Média',
            'high' => 'Alta',
            'urgent' => 'Urgente',
        ];
    }

    /**
     * Get the object type options.
     */
    public static function getObjectTypeOptions(): array
    {
        return [
            'aircraft' => 'Aeronave',
            'equipment' => 'Equipamento',
            'vehicle' => 'Veículo',
            'facility' => 'Instalação',
        ];
    }

    /**
     * Get the object name based on object_type and object_id.
     * Uses the ObjectMapping trait method.
     */
    public function getObjectNameAttribute(): ?string
    {
        return $this->getObjectName();
    }

    /**
     * Map aircraft_id to object_id for backward compatibility.
     */
    public function getAircraftIdAttribute()
    {
        return $this->object_type === 'aircraft' ? $this->object_id : null;
    }

    /**
     * Set aircraft_id to object_id for backward compatibility.
     */
    public function setAircraftIdAttribute($value)
    {
        $this->object_id = $value;
        $this->object_type = 'aircraft';
    }
}
