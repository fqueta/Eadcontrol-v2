<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Stage extends Model
{
    /**
     * Mass assignable attributes for Stage.
     * Allows creating/updating with validated payloads safely.
     */
    protected $fillable = [
        'name',
        'description',
        'color',
        'order',
        'settings',
        'funnel_id',
        'isActive',
    ];

    /**
     * Attribute casting rules.
     * Ensures JSON `settings` is serialized/deserialized and booleans handled.
     */
    protected $casts = [
        'isActive' => 'boolean',
        'settings' => 'array',
    ];

    /**
     * Relationship: Stage belongs to a Funnel.
     */
    public function funnel(): BelongsTo
    {
        return $this->belongsTo(Funnel::class);
    }

    /**
     * Default settings structure for a Stage.
     * Used to merge with provided settings on create/update.
     */
    public static function getDefaultSettings(): array
    {
        return [
            'autoAdvance' => false,
            'maxItems' => null,
            'notifyOnEntry' => false,
            'notifyOnExit' => false,
            'requireApproval' => false,
            'timeLimit' => null, // in days; null means no limit
        ];
    }

    /**
     * Return settings merged with defaults when reading from the model.
     */
    public function getSettingsWithDefaults(): array
    {
        return array_merge(self::getDefaultSettings(), $this->settings ?? []);
    }
}
