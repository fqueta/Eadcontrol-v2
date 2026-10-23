<?php

namespace App\Services\Whatsapp;

use App\Contracts\Whatsapp\WhatsappProviderInterface;
use App\Models\WhatsappInstance;

/**
 * Factory (Design Pattern) de provedores WhatsApp.
 * Hoje suporta apenas Evolution GO; novos provedores podem ser plugados
 * implementando WhatsappProviderInterface.
 */
class WhatsappProviderFactory
{
    public const EVOLUTION_GO = 'evolution-go';

    public function make(?WhatsappInstance $instance = null): WhatsappProviderInterface
    {
        $provider = new EvolutionGoProvider();

        if ($instance) {
            return $provider->withInstanceToken($instance->getInstanceToken());
        }

        return $provider;
    }

    public function makeForInstance(WhatsappInstance $instance): WhatsappProviderInterface
    {
        return $this->make($instance);
    }

    public static function normalize(?string $provider): string
    {
        return self::EVOLUTION_GO;
    }
}
