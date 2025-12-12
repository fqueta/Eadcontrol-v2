<?php

namespace App\Enums;

/**
 * Métodos de pagamento suportados para contas financeiras
 */
enum PaymentMethod: string
{
    case CASH = 'cash';
    case CREDIT_CARD = 'credit_card';
    case DEBIT_CARD = 'debit_card';
    case BANK_TRANSFER = 'bank_transfer';
    case PIX = 'pix';
    case CHECK = 'check';
    case BOLETO = 'boleto';

    /**
     * Retorna lista das strings dos métodos
     */
    public static function values(): array
    {
        return array_map(fn(self $c) => $c->value, self::cases());
    }
}