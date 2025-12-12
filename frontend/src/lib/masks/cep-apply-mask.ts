/**
 * Aplica máscara de CEP ao valor fornecido
 * @param value - String com números do CEP
 * @returns String formatada com máscara (00000-000)
 */
export function cepApplyMask(value: string): string {
  // Remove todos os caracteres não numéricos
  const cleanValue = value.replace(/\D/g, '');
  
  // Limita a 8 dígitos
  const limitedValue = cleanValue.slice(0, 8);
  
  // Aplica a máscara se tiver pelo menos 5 dígitos
  if (limitedValue.length >= 6) {
    return limitedValue.replace(/^(\d{5})(\d{1,3})$/, '$1-$2');
  }
  
  return limitedValue;
}

/**
 * Remove a máscara do CEP
 * @param value - String com CEP mascarado
 * @returns String apenas com números
 */
export function cepRemoveMask(value: string): string {
  return value.replace(/\D/g, '');
}