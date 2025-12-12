/**
 * phoneApplyMask
 * pt-BR: Aplica máscara de telefone com detecção de DDI. Para DDI 55, usa formato brasileiro; para outros DDIs, mantém `+DDI` e exibe os dígitos restantes sem forçar formatação específica.
 * en-US: Applies phone mask with country code detection. For DDI 55, uses Brazilian formatting; for other DDIs, keeps `+DDI` and shows remaining digits without enforcing country-specific formatting.
 */
export function phoneApplyMask(value: string): string {
  const raw = value || "";
  const digits = raw.replace(/\D/g, "");

  const hasPlus = raw.trim().startsWith("+");

  // Caso 1: DDI explícito com '+'
  if (hasPlus) {
    if (digits.startsWith("55")) {
      const localDigits = digits.slice(2);
      const len = localDigits.length;
      if (len === 0) return "+55"; // permite apagar
      const prefix = "+55 ";
      if (len <= 2) return `${prefix}(${localDigits}`;
      if (len <= 6) return `${prefix}(${localDigits.slice(0, 2)}) ${localDigits.slice(2)}`;
      if (len <= 10) {
        return `${prefix}(${localDigits.slice(0, 2)}) ${localDigits.slice(2, 6)}-${localDigits.slice(6)}`;
      }
      return `${prefix}(${localDigits.slice(0, 2)}) ${localDigits.slice(2, 7)}-${localDigits.slice(7, 11)}`;
    }
    // DDI diferente de 55: mantém +DDI e dígitos restantes sem formatação específica
    const ddi = digits.slice(0, Math.min(3, digits.length));
    const rest = digits.slice(ddi.length);
    return rest ? `+${ddi} ${rest}` : `+${ddi}`;
  }

  // Caso 2: Colagem sem '+', com DDI
  const pastedWithDDI = digits.length > 11;
  if (pastedWithDDI) {
    if (digits.startsWith("55")) {
      const localDigits = digits.slice(2);
      const len = localDigits.length;
      if (len === 0) return "+55";
      const prefix = "+55 ";
      if (len <= 2) return `${prefix}(${localDigits}`;
      if (len <= 6) return `${prefix}(${localDigits.slice(0, 2)}) ${localDigits.slice(2)}`;
      if (len <= 10) {
        return `${prefix}(${localDigits.slice(0, 2)}) ${localDigits.slice(2, 6)}-${localDigits.slice(6)}`;
      }
      return `${prefix}(${localDigits.slice(0, 2)}) ${localDigits.slice(2, 7)}-${localDigits.slice(7, 11)}`;
    }
    const ddiLen = Math.min(3, digits.length - 9); // garante espaço para nacional
    const ddi = digits.slice(0, ddiLen);
    const rest = digits.slice(ddiLen);
    return rest ? `+${ddi} ${rest}` : `+${ddi}`;
  }

  // Caso 3: Número nacional (assume Brasil por padrão)
  const localDigits = digits;
  const len = localDigits.length;
  if (len === 0) return "";
  const prefix = "+55 ";
  if (len <= 2) return `${prefix}(${localDigits}`;
  if (len <= 6) return `${prefix}(${localDigits.slice(0, 2)}) ${localDigits.slice(2)}`;
  if (len <= 10) {
    return `${prefix}(${localDigits.slice(0, 2)}) ${localDigits.slice(2, 6)}-${localDigits.slice(6)}`;
  }
  return `${prefix}(${localDigits.slice(0, 2)}) ${localDigits.slice(2, 7)}-${localDigits.slice(7, 11)}`;
}

/**
 * phoneRemoveMask
 * pt-BR: Remove máscara do telefone (inclui DDI), retornando somente dígitos.
 * en-US: Removes phone mask (includes country code), returning only digits.
 */
export function phoneRemoveMask(value: string): string {
  return value.replace(/\D/g, "");
}