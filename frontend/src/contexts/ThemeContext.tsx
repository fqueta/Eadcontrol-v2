import React, { createContext, useCallback, useContext, useEffect, ReactNode } from 'react';
import { predefinedThemes } from '@/lib/themes';

interface ThemeContextType {
  applyThemeSettings: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const useTheme = () => {
  const context = useContext(ThemeContext);
  // console.log('useTheme hook called, context:', !!context);
  // Se o contexto não estiver disponível (ex: em páginas que escapam ao provider padrão),
  // retorna um objeto seguro com funções vazias para evitar erros fatais
  return context || { applyThemeSettings: () => {} };
};

interface ThemeProviderProps {
  children: ReactNode;
}

/**
 * Provider que aplica as configurações de aparência globalmente no sistema
 * Carrega as configurações do localStorage e aplica no documento
 */
export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  
  /**
   * Carrega uma fonte do Google Fonts dinamicamente
   */
  const loadGoogleFont = (fontFamily: string) => {
    // Extrai o nome da fonte do valor CSS (ex: "'Roboto', sans-serif" → "Roboto")
    const match = fontFamily.match(/['"]([^'"]+)['"]/);
    if (!match) return;
    const fontName = match[1];
    if (fontName === 'Inter') return; // Inter já está carregada

    const linkId = `google-font-${fontName.toLowerCase().replace(/\s+/g, '-')}`;
    if (document.getElementById(linkId)) return; // Já carregada

    const link = document.createElement('link');
    link.id = linkId;
    link.rel = 'stylesheet';
    link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(fontName)}:wght@400;500;600;700&display=swap`;
    document.head.appendChild(link);
  };

  /**
   * Converte cor hex para valores HSL
   * Opcionalmente permite ajustar a luminosidade (útil para hover)
   */
  const hexToHsl = (hex: string, lightnessAdjust: number = 0): string => {
    // Remove o # se presente
    hex = hex.replace('#', '');
    
    // Converte hex para RGB
    const r = parseInt(hex.substr(0, 2), 16) / 255;
    const g = parseInt(hex.substr(2, 2), 16) / 255;
    const b = parseInt(hex.substr(4, 2), 16) / 255;
    
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let l = (max + min) / 2;
    let h = 0;
    let s = 0;
    
    if (max !== min) {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      
      switch (max) {
        case r: h = (g - b) / d + (g < b ? 6 : 0); break;
        case g: h = (b - r) / d + 2; break;
        case b: h = (r - g) / d + 4; break;
      }
      h /= 6;
    }
    
    // Converte para valores HSL em porcentagem/graus
    const hDeg = Math.round(h * 360);
    const sPercent = Math.round(s * 100);
    // Aplica o ajuste de luminosidade
    let lPercent = Math.round(l * 100) + lightnessAdjust;
    
    // Garante que fique entre 0 e 100
    if (lPercent < 0) lPercent = 0;
    if (lPercent > 100) lPercent = 100;
    
    return `${hDeg} ${sPercent}% ${lPercent}%`;
  };
  
  /**
   * Aplica as configurações de aparência salvas no localStorage
   */
  const applyThemeSettings = () => {
    try {
      // 1. Aplica o tema pré-definido se houver
      const themeId = localStorage.getItem('app_theme') || 'default';
      const theme = predefinedThemes.find(t => t.id === themeId);
      
      if (theme) {
        const root = document.documentElement;
        root.style.setProperty('--primary', hexToHsl(theme.colors.primary));
        root.style.setProperty('--secondary', hexToHsl(theme.colors.secondary));
        root.style.setProperty('--background', hexToHsl(theme.colors.background));
        root.style.setProperty('--foreground', hexToHsl(theme.colors.foreground));
        root.style.setProperty('--accent', hexToHsl(theme.colors.accent));
        root.style.setProperty('--primary-hover', hexToHsl(theme.colors.primary, -10));
        root.style.setProperty('--secondary-hover', hexToHsl(theme.colors.secondary, -10));
        
        if (theme.fontFamily) {
          root.style.setProperty('--font-family', theme.fontFamily);
        }
      }

      // 2. Carrega configurações de aparência (overrides)
      const savedAppearanceSettings = localStorage.getItem('appearanceSettings');
      const fontOverride = localStorage.getItem('app_font_family');
      
      if (fontOverride) {
        document.documentElement.style.setProperty('--font-family', fontOverride);
        // Load Google Font if needed
        loadGoogleFont(fontOverride);
      }

      if (savedAppearanceSettings) {
        const appearanceSettings = JSON.parse(savedAppearanceSettings);
        
        // Aplica modo escuro
        const isDarkMode = appearanceSettings.darkMode;
        if (isDarkMode) {
          document.documentElement.classList.add('dark');
        } else {
          document.documentElement.classList.remove('dark');
        }
        
        // Aplica cor primária personalizada (em ambos os modos)
        if (appearanceSettings.primaryColor) {
          const hslColor = hexToHsl(appearanceSettings.primaryColor);
          document.documentElement.style.setProperty('--primary', hslColor);
        }
        
        // Aplica cor secundária personalizada
        if (appearanceSettings.secondaryColor) {
          const hslSecondary = hexToHsl(appearanceSettings.secondaryColor);
          document.documentElement.style.setProperty('--secondary', hslSecondary);
        }

        // Aplica cores de texto (foreground) personalizadas
        if (appearanceSettings.primaryTextColor) {
          const hslPrimaryText = hexToHsl(appearanceSettings.primaryTextColor);
          document.documentElement.style.setProperty('--primary-foreground', hslPrimaryText);
        }
        if (appearanceSettings.secondaryTextColor) {
          const hslSecondaryText = hexToHsl(appearanceSettings.secondaryTextColor);
          document.documentElement.style.setProperty('--secondary-foreground', hslSecondaryText);
        }
        
        // Aplica cor de destaque personalizada
        if (appearanceSettings.accentColor) {
          const hslAccent = hexToHsl(appearanceSettings.accentColor);
          document.documentElement.style.setProperty('--accent', hslAccent);
        }

        // Aplica cor de hover primária
        if (appearanceSettings.hoverColor) {
          const hslHover = hexToHsl(appearanceSettings.hoverColor);
          document.documentElement.style.setProperty('--primary-hover', hslHover);
        } else if (appearanceSettings.primaryColor) {
          const hslHover = hexToHsl(appearanceSettings.primaryColor, -10);
          document.documentElement.style.setProperty('--primary-hover', hslHover);
        }

        // Aplica cor de hover secundária
        if (appearanceSettings.secondaryColor) {
          const hslSecondaryHover = hexToHsl(appearanceSettings.secondaryColor, -10);
          document.documentElement.style.setProperty('--secondary-hover', hslSecondaryHover);
        }

        // Aplica configurações de sidebar
        if (appearanceSettings.sidebarCollapsed !== undefined) {
          // Esta configuração será aplicada pelo UserPrefsContext
        }
        
        // Aplica configurações de notificações
        if (appearanceSettings.showNotifications !== undefined) {
          // Esta configuração será aplicada pelos componentes que usam notificações
        }

        // Aplica tamanho da fonte global
        if (appearanceSettings.fontSize) {
          const fontSizes = {
            small: '14px',
            medium: '16px',
            large: '18px',
            'extra-large': '20px'
          };
          const size = fontSizes[appearanceSettings.fontSize as keyof typeof fontSizes] || '16px';
          document.documentElement.style.setProperty('--base-font-size', size);
        }
      }
      
      // Carrega configurações básicas que afetam a aparência
      const savedBasicSettings = localStorage.getItem('basicSettings');
      if (savedBasicSettings) {
        const basicSettings = JSON.parse(savedBasicSettings);
        
        // Aplica idioma (se necessário para direção do texto)
        if (basicSettings.language) {
          document.documentElement.lang = basicSettings.language;
        }
      }
      
    } catch (error) {
      console.error('Erro ao aplicar configurações de tema:', error);
    }
  };
  
  // Aplica as configurações quando o componente é montado
  useEffect(() => {
    applyThemeSettings();
  }, []);
  
  // Escuta mudanças no localStorage para aplicar configurações em tempo real
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'appearanceSettings' || e.key === 'basicSettings') {
        applyThemeSettings();
      }
    };
    
    window.addEventListener('storage', handleStorageChange);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);
  
  const value = {
    applyThemeSettings
  };
  
  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};