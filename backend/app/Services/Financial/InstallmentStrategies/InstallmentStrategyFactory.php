<?php

namespace App\Services\Financial\InstallmentStrategies;

/**
 * Factory para resolver a estratégia de cálculo de parcelas da matrícula/proposta.
 */
class InstallmentStrategyFactory
{
    /**
     * @param string|null $strategyKey ('single' | 'bundled' | 'separate_fee' | 'only_fee' | 'custom')
     */
    public static function make(?string $strategyKey): InstallmentStrategyInterface
    {
        return match (strtolower(trim((string) $strategyKey))) {
            'single', 'avista', 'a_vista'         => new SinglePaymentStrategy(),
            'separate_fee', 'separar_taxa'        => new SeparateFeeInstallmentStrategy(),
            'only_fee', 'apenas_taxa'             => new OnlyFeeStrategy(),
            'custom', 'personalizado'             => new CustomScheduleStrategy(),
            default                               => new BundledInstallmentStrategy(),
        };
    }
}

