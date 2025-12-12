<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\MorphTo;

class ServiceOrderItem extends Model
{
    use HasFactory, SoftDeletes;

    /**
     * The attributes that are mass assignable.
     */
    protected $fillable = [
        'service_order_id',
        'item_type',
        'item_id',
        'quantity',
        'unit_price',
        'total_price',
        'notes',
    ];

    /**
     * The attributes that should be cast.
     */
    protected $casts = [
        'quantity' => 'integer',
        'unit_price' => 'decimal:2',
        'total_price' => 'decimal:2',
    ];

    /**
     * Boot the model.
     */
    protected static function boot()
    {
        parent::boot();

        // Automatically calculate total_price when saving
        static::saving(function ($item) {
            $item->total_price = $item->quantity * $item->unit_price;
        });

        // Update service order total when item is saved or deleted
        static::saved(function ($item) {
            $item->serviceOrder->calculateTotalAmount();
        });

        static::deleted(function ($item) {
            $item->serviceOrder->calculateTotalAmount();
        });
    }

    /**
     * Get the service order that owns the item.
     */
    public function serviceOrder(): BelongsTo
    {
        return $this->belongsTo(ServiceOrder::class);
    }

    /**
     * Get the product when item_type is 'product'.
     */
    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class, 'item_id');
    }

    /**
     * Get the service when item_type is 'service'.
     */
    public function service(): BelongsTo
    {
        return $this->belongsTo(Service::class, 'item_id');
    }

    /**
     * Get the item (product or service) based on item_type.
     */
    public function getItemAttribute()
    {
        if ($this->item_type === 'product') {
            return $this->product;
        } elseif ($this->item_type === 'service') {
            return $this->service;
        }
        return null;
    }

    /**
     * Get the item name based on item_type.
     */
    public function getItemNameAttribute(): ?string
    {
        $item = $this->getItemAttribute();
        return $item ? $item->name : null;
    }

    /**
     * Scope a query to only include products.
     */
    public function scopeProducts($query)
    {
        return $query->where('item_type', 'product');
    }

    /**
     * Scope a query to only include services.
     */
    public function scopeServices($query)
    {
        return $query->where('item_type', 'service');
    }

    /**
     * Scope a query to include the related item (product or service).
     */
    public function scopeWithItem($query)
    {
        return $query->with(['product', 'service']);
    }

    /**
     * Get the item type options.
     */
    public static function getItemTypeOptions(): array
    {
        return [
            'product' => 'Produto',
            'service' => 'Serviço',
        ];
    }
}