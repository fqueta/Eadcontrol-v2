export interface ThemeDefinition {
  id: string;
  name: string;
  colors: {
    primary: string;
    secondary: string;
    background: string;
    foreground: string;
    accent: string;
  };
  fontFamily?: string;
}

export const predefinedThemes: ThemeDefinition[] = [
  {
    id: 'default',
    name: 'Padrão (Incluir & Educar)',
    colors: {
      primary: '#0083c8',
      secondary: '#fdc00f',
      background: '#f8fafc',
      foreground: '#0f172a',
      accent: '#e2e8f0',
    },
  },
  {
    id: 'ocean',
    name: 'Oceano Profundo',
    colors: {
      primary: '#0e7490',
      secondary: '#2dd4bf',
      background: '#f0fdfa',
      foreground: '#083344',
      accent: '#cffafe',
    },
  },
  {
    id: 'forest',
    name: 'Floresta Amazônica',
    colors: {
      primary: '#15803d',
      secondary: '#84cc16',
      background: '#f0fdf4',
      foreground: '#064e3b',
      accent: '#dcfce7',
    },
  },
  {
    id: 'sunset',
    name: 'Pôr do Sol',
    colors: {
      primary: '#be123c',
      secondary: '#f97316',
      background: '#fff1f2',
      foreground: '#4c0519',
      accent: '#ffe4e6',
    },
  },
  {
    id: 'midnight',
    name: 'Meia Noite',
    colors: {
      primary: '#6366f1',
      secondary: '#ec4899',
      background: '#fafafa',
      foreground: '#1e1b4b',
      accent: '#e0e7ff',
    },
  },
  {
    id: 'custom',
    name: 'Personalizado',
    colors: {
      primary: '#0083c8',
      secondary: '#fdc00f',
      background: '#f8fafc',
      foreground: '#0f172a',
      accent: '#e2e8f0',
    },
  },
];
