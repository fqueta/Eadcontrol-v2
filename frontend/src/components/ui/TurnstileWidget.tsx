import React, { useEffect, useRef, useState } from 'react';

interface TurnstileWidgetProps {
  siteKey: string;
  onVerify: (token: string) => void;
  onError?: () => void;
  action?: string;
}

declare global {
  interface Window {
    turnstile?: {
      render: (
        element: HTMLElement,
        options: {
          sitekey: string;
          callback: (token: string) => void;
          'error-callback'?: () => void;
          action?: string;
          theme?: 'light' | 'dark' | 'auto';
        }
      ) => string;
      reset: (widgetId: string) => void;
    };
    onTurnstileLoad?: () => void;
  }
}

export function TurnstileWidget({ siteKey, onVerify, onError, action }: TurnstileWidgetProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [widgetId, setWidgetId] = useState<string | null>(null);

  if (!siteKey) {
    return (
      <div className="p-4 border border-red-200 bg-red-50 text-red-700 rounded text-sm text-center">
        <strong>Configuração incompleta:</strong> Chave do Turnstile não encontrada.
        <br />
        Verifique o .env e reinicie o servidor frontend.
      </div>
    );
  }

  useEffect(() => {
    // Function to initialize widget
    const initWidget = () => {
      if (containerRef.current && window.turnstile) {
        // Clear previous if any (though usually component unmounts)
        if (widgetId) window.turnstile.reset(widgetId);

        const id = window.turnstile.render(containerRef.current, {
          sitekey: siteKey,
          callback: (token) => onVerify(token),
          'error-callback': onError,
          action: action,
          theme: 'auto',
        });
        setWidgetId(id);
      }
    };

    // Check if script is already loaded
    if (window.turnstile) {
      initWidget();
    } else {
      // Load script if not present
      if (!document.querySelector('script[src^="https://challenges.cloudflare.com/turnstile/v0/api.js"]')) {
        const script = document.createElement('script');
        script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?onload=onTurnstileLoad';
        script.async = true;
        script.defer = true;
        document.head.appendChild(script);
      }

      // Setup callback
      window.onTurnstileLoad = () => {
        initWidget();
      };
    }

    return () => {
      // Cleanup if needed, though often unnecessary for widget scripts
      if (widgetId && window.turnstile) {
         try {
             window.turnstile.reset(widgetId);
         } catch(e) { /* ignore */ }
      }
      window.onTurnstileLoad = undefined;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [siteKey]); // Re-run only if siteKey changes

  return <div ref={containerRef} className="min-h-[65px] flex items-center justify-center my-4" />;
}
