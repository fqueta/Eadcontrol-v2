<?php

namespace App\Traits;

use App\Models\Aircraft;

/**
 * Trait ObjectMapping
 * 
 * Provides object mapping functionality for polymorphic relationships
 * allowing models to work with different object types dynamically.
 */
trait ObjectMapping
{
    /**
     * Get the object instance based on object_type and object_id.
     */
    public function getObjectInstance()
    {
        return $this->resolveObjectByType($this->object_type, $this->object_id);
    }

    /**
     * Resolve object by type and ID.
     */
    public function resolveObjectByType(string $objectType, int $objectId)
    {
        $modelClass = $this->getModelClassByType($objectType);
        
        if (!$modelClass || !class_exists($modelClass)) {
            return null;
        }

        return $modelClass::find($objectId);
    }

    /**
     * Get model class by object type.
     */
    public function getModelClassByType(string $objectType): ?string
    {
        $mapping = $this->getObjectTypeMapping();
        return $mapping[$objectType] ?? null;
    }

    /**
     * Get object type mapping configuration.
     */
    public function getObjectTypeMapping(): array
    {
        return [
            'aircraft' => Aircraft::class,
            // 'equipment' => Equipment::class,
            // 'vehicle' => Vehicle::class,
            // 'facility' => Facility::class,
        ];
    }

    /**
     * Get object name based on object type and ID.
     */
    public function getObjectName(): ?string
    {
        $object = $this->getObjectInstance();
        
        if (!$object) {
            return null;
        }

        // Try different common name attributes
        $nameAttributes = ['name', 'title', 'description', 'model', 'registration'];
        
        foreach ($nameAttributes as $attribute) {
            if (isset($object->$attribute) && !empty($object->$attribute)) {
                return $object->$attribute;
            }
        }

        return "ID: {$object->id}";
    }

    /**
     * Get object type display name.
     */
    public function getObjectTypeDisplayName(): string
    {
        $displayNames = [
            'aircraft' => 'Aeronave',
            'equipment' => 'Equipamento',
            'vehicle' => 'Veículo',
            'facility' => 'Instalação',
        ];

        return $displayNames[$this->object_type] ?? ucfirst($this->object_type);
    }

    /**
     * Validate if object exists for the given type and ID.
     */
    public function validateObjectExists(string $objectType, int $objectId): bool
    {
        $object = $this->resolveObjectByType($objectType, $objectId);
        return $object !== null;
    }

    /**
     * Get available object types.
     */
    public static function getAvailableObjectTypes(): array
    {
        return [
            'aircraft' => 'Aeronave',
            'equipment' => 'Equipamento',
            'vehicle' => 'Veículo',
            'facility' => 'Instalação',
        ];
    }

    /**
     * Scope to filter by object type.
     */
    public function scopeForObjectType($query, string $objectType)
    {
        return $query->where('object_type', $objectType);
    }

    /**
     * Scope to filter by specific object.
     */
    public function scopeForSpecificObject($query, int $objectId, string $objectType = null)
    {
        $query->where('object_id', $objectId);
        
        if ($objectType) {
            $query->where('object_type', $objectType);
        }
        
        return $query;
    }

    /**
     * Map legacy aircraft_id to object_id for backward compatibility.
     */
    public function mapAircraftIdToObject(int $aircraftId): array
    {
        return [
            'object_id' => $aircraftId,
            'object_type' => 'aircraft'
        ];
    }

    /**
     * Get object details for API response.
     */
    public function getObjectDetails(): array
    {
        $object = $this->getObjectInstance();
        
        if (!$object) {
            return [
                'id' => $this->object_id,
                'type' => $this->object_type,
                'name' => null,
                'exists' => false
            ];
        }

        return [
            'id' => $object->id,
            'type' => $this->object_type,
            'name' => $this->getObjectName(),
            'type_display' => $this->getObjectTypeDisplayName(),
            'exists' => true,
            'data' => $object->toArray()
        ];
    }
}