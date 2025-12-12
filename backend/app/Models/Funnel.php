<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * Model representing a sales/service funnel
 *
 * @property int $id
 * @property string $name
 * @property string|null $description
 * @property string $color
 * @property bool $isActive
 * @property array|null $settings
 * @property \Carbon\Carbon $created_at
 * @property \Carbon\Carbon $updated_at
 */
class Funnel extends Model
{
    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'name',
        'description',
        'color',
        'isActive',
        'order',
        'settings',
    ];

    /**
     * The attributes that should be cast.
     *
     * @var array<string, string>
     */
    protected $casts = [
        'isActive' => 'boolean',
        'order' => 'integer',
        'settings' => 'array',
    ];

    /**
     * Scope to get only active funnels
     */
    public function scopeActive($query)
    {
        return $query->where('isActive', true);
    }

    /**
     * Scope to get only inactive funnels
     */
    public function scopeInactive($query)
    {
        return $query->where('isActive', false);
    }

    /**
     * Get the default settings structure
     */
    public static function getDefaultSettings(): array
    {
        return [
            'autoAdvance' => false,
            'notifyOnStageChange' => false,
            'requireApproval' => false,
            'place' => 'Vendas',
        ];
    }

    /**
     * Get settings with defaults merged
     */
    public function getSettingsWithDefaults(): array
    {
        return array_merge(self::getDefaultSettings(), $this->settings ?? []);
    }

    /**
     * Relationship: Funnel has many Stages.
     * Provides access to stages ordered by the `order` field.
     */
    public function stages(): HasMany
    {
        return $this->hasMany(Stage::class)->orderBy('order');
    }
}
