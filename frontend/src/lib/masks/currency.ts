/**
 * currency.ts — Funções de máscara e parsing de moeda
 * pt-BR: Utilitários para aplicar/remover máscara monetária (BRL/USD) em inputs.
 * en-US: Utilities to apply/remove currency mask (BRL/USD) for inputs.
 */

/**
 * currencyApplyMask
 * pt-BR: Aplica máscara de moeda usando Intl.NumberFormat. Usa centavos implícitos.
 * en-US: Applies currency mask using Intl.NumberFormat. Interprets input as cents.
 *
 * @param value String digitada pelo usuário (qualquer formato)
 * @param locale Locale para formatação (ex.: 'pt-BR', 'en-US')
 * @param currency Código de moeda (ex.: 'BRL', 'USD')
 * @returns String formatada com símbolo de moeda
 */
export function currencyApplyMask(value: string, locale: 'pt-BR' | 'en-US' = 'pt-BR', currency?: string): string {
  const onlyDigits = String(value || '').replace(/\D/g, '');
  const amount = Number(onlyDigits) / 100;
  const fmt = new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: currency || (locale === 'pt-BR' ? 'BRL' : 'USD'),
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  if (!isFinite(amount)) return fmt.format(0);
  return fmt.format(amount);
}

/**
 * currencyRemoveMaskToNumber
 * pt-BR: Converte string mascarada para número com ponto decimal (xx.xx).
 * en-US: Converts masked string to number with dot decimal (xx.xx).
 *
 * @param masked String com máscara (ex.: "R$ 1.234,56" ou "$1,234.56")
 * @returns Número em ponto-flutuante (ex.: 1234.56)
 */
export function currencyRemoveMaskToNumber(masked: string): number {
  const onlyDigits = String(masked || '').replace(/\D/g, '');
  const amount = Number(onlyDigits) / 100;
  return isFinite(amount) ? amount : 0;
}

/**
 * currencyRemoveMaskToString
 * pt-BR: Converte máscara para string com ponto decimal (ex.: "1234.56").
 * en-US: Converts mask to string with dot decimal (e.g., "1234.56").
 */
export function currencyRemoveMaskToString(masked: string): string {
  return currencyRemoveMaskToNumber(masked).toFixed(2);
}