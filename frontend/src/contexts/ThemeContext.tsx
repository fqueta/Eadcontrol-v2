import React, { createContext, useContext, useEffect, ReactNode } from 'react';

interface ThemeContextType {
  applyThemeSettings: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
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
   * Converte cor hex para valores HSL
   */
  const hexToHsl = (hex: string): string => {
    // Remove o # se presente
    hex = hex.replace('#', '');
    
    // Converte hex para RGB
    const r = parseInt(hex.substr(0, 2), 16) / 255;
    const g = parseInt(hex.substr(2, 2), 16) / 255;
    const b = parseInt(hex.substr(4, 2), 16) / 255;
    
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h = 0;
    let s = 0;
    const l = (max + min) / 2;
    
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
    const lPercent = Math.round(l * 100);
    
    return `${hDeg} ${sPercent}% ${lPercent}%`;
  };
  
  /**
   * Aplica as configurações de aparência salvas no localStorage
   */
  const applyThemeSettings = () => {
    try {
      // Carrega configurações de aparência
      const savedAppearanceSettings = localStorage.getItem('appearanceSettings');
      if (savedAppearanceSettings) {
        const appearanceSettings = JSON.parse(savedAppearanceSettings);
        
        // Aplica modo escuro
        const isDarkMode = appearanceSettings.darkMode;
        if (isDarkMode) {
          document.documentElement.classList.add('dark');
        } else {
          document.documentElement.classList.remove('dark');
        }
        
        // Aplica cor primária personalizada APENAS quando NÃO estiver no modo escuro
        if (appearanceSettings.primaryColor && !isDarkMode) {
          const hslColor = hexToHsl(appearanceSettings.primaryColor);
          document.documentElement.style.setProperty('--primary', hslColor);
          // console.log(`Cor primária aplicada (modo claro): ${hslColor}`);
        } else if (isDarkMode) {
          // Remove a cor primária personalizada no modo escuro para usar a padrão
          document.documentElement.style.removeProperty('--primary');
          // console.log('Cor primária personalizada removida (modo escuro ativo)');
        }
        
        // Aplica cor secundária personalizada
        if (appearanceSettings.secondaryColor) {
          const hslSecondary = hexToHsl(appearanceSettings.secondaryColor);
          document.documentElement.style.setProperty('--secondary', hslSecondary);
        }
        
        // Aplica cor de destaque personalizada
        if (appearanceSettings.accentColor) {
          const hslAccent = hexToHsl(appearanceSettings.accentColor);
          document.documentElement.style.setProperty('--accent', hslAccent);
        }
        
        // Aplica configurações de sidebar
        if (appearanceSettings.sidebarCollapsed !== undefined) {
          // Esta configuração será aplicada pelo UserPrefsContext
        }
        
        // Aplica configurações de notificações
        if (appearanceSettings.showNotifications !== undefined) {
          // Esta configuração será aplicada pelos componentes que usam notificações
        }
        
        // console.log('Configurações de aparência aplicadas:', appearanceSettings);
      }
      
      // Carrega configurações básicas que afetam a aparência
      const savedBasicSettings = localStorage.getItem('basicSettings');
      if (savedBasicSettings) {
        const basicSettings = JSON.parse(savedBasicSettings);
        
        // Aplica idioma (se necessário para direção do texto)
        if (basicSettings.language) {
          document.documentElement.lang = basicSettings.language;
        }
        
        console.log('Configurações básicas aplicadas:', basicSettings);
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