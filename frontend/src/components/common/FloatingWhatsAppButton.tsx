import React, { useCallback, useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import {
  getInstitutionWhatsApp,
  getWhatsAppFloatEnabled,
  getWhatsAppFloatMessage,
} from '@/lib/branding';

/**
 * FloatingWhatsAppButton
 * pt-BR: Botão flutuante global de WhatsApp (estilo canto inferior direito).
 *        Lê número/mensagem/ativo de `app_whatsapp*` (localStorage + branding público).
 *        Fica oculto no painel admin (/admin) para não poluir a operação.
 * en-US: Global floating WhatsApp button. Hidden on /admin routes.
 */
export const FloatingWhatsAppButton: React.FC = () => {
  const location = useLocation();
  const [visible, setVisible] = useState(false);
  const [href, setHref] = useState('');

  const refresh = useCallback(() => {
    try {
      const enabled = getWhatsAppFloatEnabled(true);
      const raw = getInstitutionWhatsApp('');
      const digits = String(raw || '').replace(/\D/g, '');
      const msg = getWhatsAppFloatMessage();
      if (!enabled || !digits) {
        setVisible(false);
        return;
      }
      setHref(`https://wa.me/${digits}?text=${encodeURIComponent(msg)}`);
      setVisible(true);
    } catch {
      setVisible(false);
    }
  }, []);

  useEffect(() => {
    refresh();
    const onUpd = () => refresh();
    window.addEventListener('branding:updated', onUpd);
    window.addEventListener('storage', onUpd);
    return () => {
      window.removeEventListener('branding:updated', onUpd);
      window.removeEventListener('storage', onUpd);
    };
  }, [refresh]);

  // Oculta no admin e nas telas de login/cadastro para não poluir a operação
  const path = location?.pathname || '';
  if (
    !visible ||
    path.startsWith('/admin') ||
    path.startsWith('/login') ||
    path.startsWith('/register')
  ) {
    return null;
  }

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Conversar no WhatsApp"
      title="Falar no WhatsApp"
      className="fixed bottom-[84px] md:bottom-5 right-4 md:right-5 z-[99990] group flex h-12 w-12 md:h-14 md:w-14 items-center justify-center rounded-full bg-[#25D366] text-white shadow-2xl shadow-green-600/40 transition-all hover:scale-110 hover:bg-[#1EBE5B] active:scale-95"
    >
      {/* Ícone oficial WhatsApp (SVG inline, sem dependência extra) */}
      <svg viewBox="0 0 32 32" className="h-7 w-7 fill-current" aria-hidden="true">
        <path d="M16 3C9.4 3 4 8.4 4 15c0 2.4.7 4.6 1.9 6.5L4 29l7.7-1.8c1.8 1 3.9 1.5 6 1.5h.3c6.6 0 12-5.4 12-12S22.6 3 16 3zm0 22.1c-1.9 0-3.7-.5-5.3-1.5l-.4-.2-4.6 1.1 1.1-4.4-.3-.4c-1-1.6-1.6-3.5-1.6-5.5 0-5.6 4.6-10.2 10.2-10.2 2.7 0 5.3 1.1 7.2 3 1.9 1.9 3 4.5 3 7.2 0 5.6-4.6 10.2-10.3 10.2zm5.6-7.6c-.3-.2-1.8-.9-2.1-1-.3-.1-.5-.2-.7.2-.2.3-.8 1-.9 1.2-.2.2-.3.2-.6.1-.3-.2-1.3-.5-2.4-1.5-.9-.8-1.5-1.8-1.7-2.1-.2-.3 0-.5.1-.6l.5-.6c.2-.2.2-.3.3-.6.1-.2 0-.4 0-.6-.1-.2-.7-1.7-1-2.3-.2-.6-.5-.5-.7-.5h-.6c-.2 0-.6.2-.9.4-.3.3-1.1 1.1-1.1 2.7s1.2 3.1 1.3 3.4c.1.2 2.3 3.5 5.5 4.9.8.3 1.4.5 1.8.7.8.2 1.5.2 2 .1.6-.1 1.8-.7 2.1-1.5.2-.7.2-1.3.2-1.5-.1-.1-.3-.2-.6-.3z" />
      </svg>
      {/* Ping sutil para chamar atenção */}
      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#25D366] opacity-20 group-hover:opacity-0" />
    </a>
  );
};

export default FloatingWhatsAppButton;
