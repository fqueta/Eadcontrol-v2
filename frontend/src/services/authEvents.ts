/**
 * Emissor de eventos de autenticação
 * pt-BR: Utilitário para emitir eventos relacionados à autenticação.
 * en-US: Utility to emit authentication-related events.
 */

/**
 * emitInvalidToken
 * pt-BR: Emite um evento global indicando que o token é inválido.
 *        O AuthContext deve escutar este evento e realizar o logout.
 * en-US: Emits a global event indicating the token is invalid.
 *        The AuthContext should listen to this event and perform logout.
 */
export function emitInvalidToken(): void {
  try {
    const event = new CustomEvent('auth:invalid_token');
    window.dispatchEvent(event);
  } catch (e) {
    // Fallback para ambientes sem CustomEvent
    const evt = { type: 'auth:invalid_token' } as any;
    // @ts-expect-error Emissão simplificada
    window.dispatchEvent(evt);
  }
}

/**
 * emitInactiveUser
 * pt-BR: Emite um evento global indicando que o usuário está inativo.
 *        O AuthContext deve escutar este evento e realizar o logout.
 * en-US: Emits a global event indicating the user is inactive.
 *        The AuthContext should listen to this event and perform logout.
 */
export function emitInactiveUser(): void {
  try {
    const event = new CustomEvent('auth:inactive_user');
    window.dispatchEvent(event);
  } catch (e) {
    // Fallback para ambientes sem CustomEvent
    const evt = { type: 'auth:inactive_user' } as any;
    // @ts-expect-error Emissão simplificada
    window.dispatchEvent(evt);
  }
}