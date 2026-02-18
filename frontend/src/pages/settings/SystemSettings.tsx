import React, { useState, useEffect } from "react";
import { useMask, format } from '@react-input/mask';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Settings, Save, Palette, Link, Image as ImageIcon, Building2, ShieldCheck, Layers, Plus, MonitorPlay, Clock } from "lucide-react";
import { getInstitutionName, getInstitutionSlogan, getInstitutionDescription, getInstitutionUrl, syncBrandingToMetaTags } from "@/lib/branding";
import { systemSettingsService, AdvancedSystemSettings } from "@/services/systemSettingsService";
import { useApiOptions } from "@/hooks/useApiOptions";
import { useFunnelsList, useStagesList } from "@/hooks/funnels";
import { fileStorageService, type FileStorageItem, extractFileStorageUrl } from "@/services/fileStorageService";
import { ImageUpload } from "@/components/lib/ImageUpload";
import { useAuth } from "@/contexts/AuthContext";

/**
 * Página de configurações do sistema
 * Contém duas abas: Configurações Básicas e Configurações Avançadas
 * Cada aba possui cards com diferentes tipos de configurações
 */
export default function SystemSettings() {
  const { user } = useAuth();
  const permissionId = user?.permission_id ? parseInt(String(user.permission_id)) : 0;

  // Estado da aba ativa
  const [activeTab, setActiveTab] = useState("basic");
  
  // Estado de carregamento
  const [isLoading, setIsLoading] = useState(false);
  
  // Hook para gerenciar opções da API
  const { 
    options: apiOptions, 
    isLoading: apiLoading, 
    error: apiError, 
    updateOption, 
    saveMultipleOptions, 
    getApiConfigOptions 
  } = useApiOptions();
  
  // Estado local para as configurações de API (antes de salvar)
  const [localApiOptions, setLocalApiOptions] = useState<{[key: number]: string}>({});
  /**
   * getCurrentOptionValue
   * pt-BR: Retorna o valor atual de uma opção, priorizando edição local.
   * en-US: Returns current option value, prioritizing local edits.
   */
  const getCurrentOptionValue = (option: any) => {
    return localApiOptions[option.id] !== undefined ? localApiOptions[option.id] : option.value;
  };
  /**
   * Funis/Etapas para selects de padrão
   * pt-BR: Carrega funis (área de vendas) e etapas do funil selecionado.
   * en-US: Loads funnels (sales area) and stages for the selected funnel.
   */
  const { data: funnelsData, isLoading: isLoadingFunnels } = useFunnelsList({ per_page: 200 });
  const salesFunnels = React.useMemo(() => {
    const list: any[] = (funnelsData?.data || (funnelsData as any)?.items || []);
    return list.filter((f) => String(f?.settings?.place || '').toLowerCase() === 'vendas');
  }, [funnelsData]);
  const defaultFunnelOption = React.useMemo(() => (
    (apiOptions || []).find((o: any) => o.url === 'default_funil_vendas_id') || null
  ), [apiOptions]);
  const defaultStageOption = React.useMemo(() => (
    (apiOptions || []).find((o: any) => o.url === 'default_etapa_vendas_id') || null
  ), [apiOptions]);
  const selectedDefaultFunnelId = React.useMemo(() => (
    defaultFunnelOption ? String(getCurrentOptionValue(defaultFunnelOption) || '') : ''
  ), [defaultFunnelOption, localApiOptions]);
  const { data: stagesData, isLoading: isLoadingStages } = useStagesList(String(selectedDefaultFunnelId || ''), { per_page: 200 }, { enabled: !!selectedDefaultFunnelId });
  const stagesForDefaultFunnel = React.useMemo(() => (
    (stagesData as any)?.data || (stagesData as any)?.items || []
  ), [stagesData]);

  // Estados para configurações básicas - Switch
  const [basicSwitchSettings, setBasicSwitchSettings] = useState(() => {
    const saved = localStorage.getItem('basicSwitchSettings');
    return saved ? JSON.parse(saved) : {
      enableNotifications: true,
      enableAutoBackup: false,
      enableMaintenanceMode: false,
      enableDebugMode: false,
    };
  });

  // Nota: As configurações de aparência agora são aplicadas globalmente pelo ThemeProvider

  // Estados para configurações básicas - Select
  const [basicSelectSettings, setBasicSelectSettings] = useState(() => {
    const saved = localStorage.getItem('basicSelectSettings');
    return saved ? JSON.parse(saved) : {
      defaultLanguage: "pt-BR",
      timezone: "America/Sao_Paulo",
      dateFormat: "DD/MM/YYYY",
      currency: "BRL",
    };
  });

  // Estados para configurações de aparência
  const [appearanceSettings, setAppearanceSettings] = useState(() => {
    const saved = localStorage.getItem('appearanceSettings');
    return saved ? JSON.parse(saved) : {
      darkMode: false,
      primaryColor: "#0b217b",
      primaryTextColor: "#ffffff",
      secondaryColor: "#4b89cd",
      secondaryTextColor: "#ffffff",
      hoverColor: "#0056b3",
      fontSize: "medium",
      theme: "default",
      compactMode: true,
      showAnimations: true,
    };
  });

  // Estados para configurações avançadas - Switch
  const [advancedSwitchSettings, setAdvancedSwitchSettings] = useState({
    enableApiLogging: true,
    enableCaching: true,
    enableCompression: false,
    enableSslRedirect: true,
  });

  // Estados para configurações avançadas - Select
  const [advancedSelectSettings, setAdvancedSelectSettings] = useState({
    logLevel: "info",
    cacheDriver: "redis",
    sessionDriver: "database",
    queueDriver: "sync",
  });

  // Estados para configurações avançadas - Input
  const [advancedInputSettings, setAdvancedInputSettings] = useState({
    maxFileSize: "",
    sessionTimeout: "",
    apiRateLimit: "",
    maxConnections: "",
    backupRetention: "",
    url_api_aeroclube: "",
    token_api_aeroclube: "",
    import_users_url: "", // New state for import URL
    import_type: "users", // New state for import type
  });

  /**
   * Manipula mudanças nos switches das configurações básicas
   */
  const handleBasicSwitchChange = (key: string, value: boolean) => {
    const newSettings = { ...basicSwitchSettings, [key]: value };
    setBasicSwitchSettings(newSettings);
    localStorage.setItem('basicSwitchSettings', JSON.stringify(newSettings));
    
    // Aplicar configurações do sistema em tempo real
    applySystemSettings(newSettings);
  };

  /**
   * Manipula mudanças nos selects das configurações básicas
   */
  const handleBasicSelectChange = (key: string, value: string) => {
    const newSettings = { ...basicSelectSettings, [key]: value };
    setBasicSelectSettings(newSettings);
    localStorage.setItem('basicSelectSettings', JSON.stringify(newSettings));
  };

  /**
   * Manipula mudanças nas configurações de aparência
   */
  const handleAppearanceChange = (key: string, value: string | boolean) => {
    const newSettings = { ...appearanceSettings, [key]: value };
    setAppearanceSettings(newSettings);
    localStorage.setItem('appearanceSettings', JSON.stringify(newSettings));
    
    // Aplicar configurações de aparência em tempo real
    applyAppearanceSettings(newSettings);
  };

  // -----------------------------
  // Branding & Imagens (Logo, Favicon, Social)
  // -----------------------------
  /**
   * Branding URLs state
   * pt-BR: Inicializa com valores persistidos em localStorage, se existirem.
   * en-US: Initializes with values persisted in localStorage, if present.
   */
  const [brandingLogoUrl, setBrandingLogoUrl] = useState<string | null>(() => {
    try { return (localStorage.getItem('app_logo_url') || '').trim() || null; } catch { return null; }
  });
  const [brandingFaviconUrl, setBrandingFaviconUrl] = useState<string | null>(() => {
    try { return (localStorage.getItem('app_favicon_url') || '').trim() || null; } catch { return null; }
  });
  const [brandingSocialUrl, setBrandingSocialUrl] = useState<string | null>(() => {
    try { return (localStorage.getItem('app_social_image_url') || '').trim() || null; } catch { return null; }
  });

  /**
   * Institution name state
   * pt-BR: Nome da instituição, com valor inicial via util de branding.
   * en-US: Institution name, initial value via branding util.
   */
  const [institutionName, setInstitutionName] = useState<string>(() => getInstitutionName());
  /**
   * Institution extra fields
   * pt-BR: Slogan, descrição curta e URL institucional.
   * en-US: Slogan, short description and institutional URL.
   */
  const [institutionSlogan, setInstitutionSlogan] = useState<string>(() => getInstitutionSlogan());
  const [institutionDescription, setInstitutionDescription] = useState<string>(() => getInstitutionDescription());
  const [institutionUrl, setInstitutionUrl] = useState<string>(() => getInstitutionUrl());
  const [institutionWhatsApp, setInstitutionWhatsApp] = useState<string>(() => {
    try { 
      const val = (localStorage.getItem('app_whatsapp') || '').trim();
      return val ? format(val, { mask: '+__ (__) _____-____', replacement: { _: /\d/ } }) : '';
    } catch { return ''; }
  });

  /**
   * hydrateBrandingFromApiOptions
   * pt-BR: Se localStorage está vazio, carrega das opções da API e persiste
   *        localmente (localStorage) e globalmente (window.__APP_*__),
   *        garantindo que cabeçalhos/rodapés usem imediatamente os valores.
   * en-US: If localStorage is empty, loads from API options and persists to
   *        localStorage and window globals (window.__APP_*__), ensuring
   *        headers/footers immediately reflect the values.
   */
  useEffect(() => {
    try {
      const logo = (localStorage.getItem('app_logo_url') || '').trim();
      const fav = (localStorage.getItem('app_favicon_url') || '').trim();
      const soc = (localStorage.getItem('app_social_image_url') || '').trim();
      const inst = (localStorage.getItem('app_institution_name') || '').trim();
      const whatsapp = (localStorage.getItem('app_whatsapp') || '').trim();
      // Optimization: Always try to sync from API if options are available
      // to ensure settings page reflects the database
      const getOpt = (key: string) => (apiOptions || []).find((o: any) => String(o?.url || '') === key);
      const getOptByKeys = (keys: string[]) => {
        for (const k of keys) {
          const found = getOpt(k);
          if (found) return found;
        }
        return null;
      };

      const optHover = getOpt('app_hover_color');
      const valHover = (optHover && (optHover.value ?? '')) || '';
      if (valHover && valHover !== appearanceSettings.hoverColor) {
        setAppearanceSettings((prev: any) => ({ ...prev, hoverColor: valHover }));
        localStorage.setItem('appearanceSettings', JSON.stringify({ ...appearanceSettings, hoverColor: valHover }));
      }

      const optLogo = getOpt('app_logo_url');
      const valLogo = (optLogo && (optLogo.value ?? '')) || '';
      if (valLogo && valLogo !== brandingLogoUrl) {
        setBrandingLogoUrl(valLogo);
        localStorage.setItem('app_logo_url', valLogo);
        (window as any).__APP_LOGO_URL__ = valLogo;
      }

      const optFav = getOpt('app_favicon_url');
      const valFav = (optFav && (optFav.value ?? '')) || '';
      if (valFav && valFav !== brandingFaviconUrl) {
        setBrandingFaviconUrl(valFav);
        localStorage.setItem('app_favicon_url', valFav);
        (window as any).__APP_FAVICON_URL__ = valFav;
      }

      const optSoc = getOpt('app_social_image_url');
      const valSoc = (optSoc && (optSoc.value ?? '')) || '';
      if (valSoc && valSoc !== brandingSocialUrl) {
        setBrandingSocialUrl(valSoc);
        localStorage.setItem('app_social_image_url', valSoc);
        (window as any).__APP_SOCIAL_IMAGE_URL__ = valSoc;
      }

      const oInst = getOptByKeys(['app_institution_name', 'site_name', 'app_name']);
      const valInst = (oInst && (oInst.value ?? '')) || '';
      if (valInst && valInst !== institutionName) {
        setInstitutionName(valInst);
        localStorage.setItem('app_institution_name', valInst);
        (window as any).__APP_INSTITUTION_NAME__ = valInst;
      }

      const optSlogan = getOptByKeys(['app_institution_slogan']);
      const valSlogan = (optSlogan && (optSlogan.value ?? '')) || '';
      if (valSlogan && valSlogan !== institutionSlogan) {
        setInstitutionSlogan(valSlogan);
        localStorage.setItem('app_institution_slogan', valSlogan);
        (window as any).__APP_INSTITUTION_SLOGAN__ = valSlogan;
      }

      const optDesc = getOptByKeys(['app_institution_description']);
      const valDesc = (optDesc && (optDesc.value ?? '')) || '';
      if (valDesc && valDesc !== institutionDescription) {
        setInstitutionDescription(valDesc);
        localStorage.setItem('app_institution_description', valDesc);
        (window as any).__APP_INSTITUTION_DESCRIPTION__ = valDesc;
      }

      const optUrl = getOptByKeys(['app_institution_url']);
      const valUrl = (optUrl && (optUrl.value ?? '')) || '';
      if (valUrl && valUrl !== institutionUrl) {
        setInstitutionUrl(valUrl);
        localStorage.setItem('app_institution_url', valUrl);
        (window as any).__APP_INSTITUTION_URL__ = valUrl;
      }

      const optWhatsapp = getOptByKeys(['app_whatsapp']);
      const valWhatsapp = (optWhatsapp && (optWhatsapp.value ?? '')) || '';
      if (valWhatsapp && valWhatsapp !== institutionWhatsApp) {
        const formatted = format(valWhatsapp, { mask: '+__ (__) _____-____', replacement: { _: /\d/ } });
        setInstitutionWhatsApp(formatted);
        localStorage.setItem('app_whatsapp', valWhatsapp);
        (window as any).__APP_WHATSAPP__ = valWhatsapp;
      }
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiOptions]);

  /**
   * handleSaveInstitution
   * pt-BR: Persiste o nome da instituição em localStorage, globais e opções da API.
   * en-US: Persists institution name to localStorage, globals and API options.
   */
  async function handleSaveInstitution() {
    try {
      const v = (institutionName || '').trim();
      if (!v) {
        toast.warning('Informe um nome de instituição válido.');
        return;
      }
      // Persist local and globals
      try { localStorage.setItem('app_institution_name', v); } catch {}
      const anyWin = window as any;
      anyWin.__APP_INSTITUTION_NAME__ = v;
      anyWin.__APP_SITE_NAME__ = anyWin.__APP_SITE_NAME__ || v;
      anyWin.__APP_APP_NAME__ = anyWin.__APP_APP_NAME__ || v;

      // Persist optional fields locally/globally
      const s = (institutionSlogan || '').trim();
      const d = (institutionDescription || '').trim();
      const u = (institutionUrl || '').trim();
      const w = (institutionWhatsApp || '').trim();
      if (s) { try { localStorage.setItem('app_institution_slogan', s); } catch {} anyWin.__APP_INSTITUTION_SLOGAN__ = s; }
      if (d) { try { localStorage.setItem('app_institution_description', d); } catch {} anyWin.__APP_INSTITUTION_DESCRIPTION__ = d; }
      if (u) { try { localStorage.setItem('app_institution_url', u); } catch {} anyWin.__APP_INSTITUTION_URL__ = u; }
      
      const wClean = (institutionWhatsApp || '').replace(/\D/g, '');
      if (wClean) { try { localStorage.setItem('app_whatsapp', wClean); } catch {} anyWin.__APP_WHATSAPP__ = wClean; }

      // Persist to API options
      const ok = await saveMultipleOptions({ 
        app_institution_name: v,
        ...(s ? { app_institution_slogan: s } : {}),
        ...(d ? { app_institution_description: d } : {}),
        ...(u ? { app_institution_url: u } : {}),
        ...(wClean ? { app_whatsapp: wClean } : {}),
      });
      // Update meta tags immediately
      syncBrandingToMetaTags({ name: v, slogan: s, description: d });

      toast.success('Nome da instituição salvo com sucesso.');
    } catch (error: any) {
      toast.error(`Falha ao salvar nome: ${error?.message || 'erro desconhecido'}`);
    }
  }

  /**
   * handleUploadGeneric
   * pt-BR: Faz upload genérico via /file-storage e retorna a URL pública.
   * en-US: Uploads a file via /file-storage and returns the public URL.
   */
  async function handleUploadGeneric(file: File, meta?: Record<string, any>): Promise<string> {
    try {
      const resp: any = await fileStorageService.upload<any>(file, {
        active: true,
        ...meta,
      });
      // Extrai URL usando util compartilhado do serviço
      const url = extractFileStorageUrl(resp);
      if (!url) throw new Error('URL não retornada pelo servidor.');
      return url;
    } catch (error: any) {
      toast.error(`Falha ao enviar arquivo: ${error?.message || 'erro desconhecido'}`);
      throw error;
    }
  }

  /**
   * handleUploadLogo
   * pt-BR: Envia a logo e atualiza estado.
   * en-US: Uploads the logo and updates state.
   */
  async function handleUploadLogo(file: File): Promise<string> {
    const url = await handleUploadGeneric(file, { title: 'logo', name: 'app-logo' });
    setBrandingLogoUrl(url);
    return url;
  }

  /**
   * handleUploadFavicon
   * pt-BR: Envia o favicon e atualiza estado.
   * en-US: Uploads the favicon and updates state.
   */
  async function handleUploadFavicon(file: File): Promise<string> {
    const url = await handleUploadGeneric(file, { title: 'favicon', name: 'app-favicon' });
    setBrandingFaviconUrl(url);
    return url;
  }

  /**
   * handleUploadSocial
   * pt-BR: Envia a imagem social (OpenGraph/Twitter) e atualiza estado.
   * en-US: Uploads the social image (OpenGraph/Twitter) and updates state.
   */
  async function handleUploadSocial(file: File): Promise<string> {
    const url = await handleUploadGeneric(file, { title: 'social-image', name: 'app-social-image' });
    setBrandingSocialUrl(url);
    return url;
  }

  /**
   * handleSaveBranding
   * pt-BR: Persiste URLs em localStorage e também em /options/all (se disponível).
   *        O index.html lerá de localStorage e aplicará dinamicamente.
   * en-US: Persists URLs to localStorage and also to /options/all (if available).
   *        index.html will read from localStorage and apply dynamically.
   */
  async function handleSaveBranding() {
    const payload: Record<string, string> = {};
    if (brandingLogoUrl) payload['app_logo_url'] = brandingLogoUrl;
    if (brandingFaviconUrl) payload['app_favicon_url'] = brandingFaviconUrl;
    if (brandingSocialUrl) payload['app_social_image_url'] = brandingSocialUrl;

    try {
      // Persistir em localStorage
      Object.entries(payload).forEach(([k, v]) => localStorage.setItem(k, v));

      // Opcional: persistir em /options/all para retenção no backend
      if (Object.keys(payload).length > 0) {
        const ok = await saveMultipleOptions(payload);
        if (!ok) {
          toast.warning('URLs salvas localmente; falha ao persistir em opções da API.');
        }
      }

      toast.success('Branding salvo. Recarregue a página para aplicar.');
    } catch (error: any) {
      toast.error(`Falha ao salvar branding: ${error?.message || 'erro desconhecido'}`);
    }
  }

  /**
   * Aplica configurações do sistema em tempo real
   */
  const applySystemSettings = (settings: typeof basicSwitchSettings) => {
    // Aplicar notificações
    if (settings.enableNotifications) {
      // Habilitar notificações do sistema
      console.log('Notificações habilitadas');
    } else {
      console.log('Notificações desabilitadas');
    }
    
    // Aplicar modo de manutenção
    if (settings.enableMaintenanceMode) {
      document.body.classList.add('maintenance-mode');
      toast.info('Modo de manutenção ativado');
    } else {
      document.body.classList.remove('maintenance-mode');
    }
    
    // Aplicar modo debug
    if (settings.enableDebugMode) {
      console.log('Modo debug ativado - logs detalhados habilitados');
      window.localStorage.setItem('debug', 'true');
    } else {
      window.localStorage.removeItem('debug');
    }
  };

  /**
   * Aplica configurações de aparência em tempo real
   */
  const applyAppearanceSettings = (settings: typeof appearanceSettings) => {
    const root = document.documentElement;
    
    // Aplicar modo escuro
    if (settings.darkMode) {
      document.body.classList.add('dark');
    } else {
      document.body.classList.remove('dark');
    }
    
    // Aplicar cores personalizadas
    root.style.setProperty('--primary-color', settings.primaryColor);
    root.style.setProperty('--primary-text-color', settings.primaryTextColor || '#ffffff');
    root.style.setProperty('--secondary-color', settings.secondaryColor);
    root.style.setProperty('--secondary-text-color', settings.secondaryTextColor || '#ffffff');
    
    // Aplicar tamanho da fonte
    const fontSizes = {
      small: '14px',
      medium: '16px',
      large: '18px',
      'extra-large': '20px'
    };
    root.style.setProperty('--base-font-size', fontSizes[settings.fontSize as keyof typeof fontSizes]);
    
    // Aplicar modo compacto
    if (settings.compactMode) {
      document.body.classList.add('compact-mode');
    } else {
      document.body.classList.remove('compact-mode');
    }
    
    // Aplicar animações
    if (!settings.showAnimations) {
      document.body.classList.add('no-animations');
    } else {
      document.body.classList.remove('no-animations');
    }
  };

  /**
   * Salva configurações de aparência
   */
  const handleSaveAppearanceSettings = async () => {
    // 1. Salva no localStorage para aplicação imediata local
    localStorage.setItem('appearanceSettings', JSON.stringify(appearanceSettings));
    applyAppearanceSettings(appearanceSettings);
    
    // 2. Persiste no backend para aplicação pública/global
    try {
      await systemSettingsService.saveAdvancedSettings({
        ...advancedSwitchSettings, // Mantém outros settings se necessário, mas o endpoint /options/all aceita parcial
        // Mapeia para as chaves esperadas no backend (prefixo app_)
        app_primary_color: appearanceSettings.primaryColor,
        app_primary_text_color: appearanceSettings.primaryTextColor,
        app_secondary_color: appearanceSettings.secondaryColor,
        app_secondary_text_color: appearanceSettings.secondaryTextColor,
        app_hover_color: appearanceSettings.hoverColor,
        app_dark_mode_default: appearanceSettings.darkMode ? 'true' : 'false',
      } as any);
      
      toast.success('Aparência salva e publicada com sucesso!');
    } catch (error) {
      console.error('Erro ao salvar aparência no servidor:', error);
      toast.error('Salvo localmente, mas erro ao sincronizar com servidor.');
    }
  };

  /**
   * Manipula mudanças nas configurações de API (apenas localmente)
   */
  const handleApiOptionChange = (id: number, value: string) => {
    setLocalApiOptions(prev => ({
      ...prev,
      [id]: value
    }));
  };

  /**
   * Salva todas as configurações de API
   */
  const handleSaveApiSettings = async () => {
    setIsLoading(true);
    
    try {
      // Converte para o formato {name_campo: value} com todos os campos
      const dataToSave: {[key: string]: string} = {};
      
      getApiConfigOptions().forEach((option) => {
        const currentValue = getCurrentOptionValue(option);
        dataToSave[option.url] = currentValue || '';
      });
      
      if (Object.keys(dataToSave).length === 0) {
        toast.info('Nenhuma configuração encontrada para salvar');
        return;
      }
      
      const success = await saveMultipleOptions(dataToSave);
      
      if (success) {
        toast.success('Configurações de API salvas com sucesso!');
        // setLocalApiOptions({}); // Limpa as mudanças locais
      } else {
        toast.error('Erro ao salvar configurações de API');
      }
    } catch (error) {
      console.error('Erro ao salvar configurações de API:', error);
      toast.error('Erro ao salvar configurações de API');
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * handleSaveFunctionalityOptions
   * pt-BR: Monta o payload com todas as opções do endpoint `/options/all` e salva em lote.
   * en-US: Builds the payload with all options from `/options/all` and saves them in batch.
   */
  const handleSaveFunctionalityOptions = async () => {
    setIsLoading(true);
    try {
      const dataToSave: { [key: string]: string } = {};
      (apiOptions || []).forEach((option: any) => {
        const currentValue = getCurrentOptionValue(option);
        dataToSave[option.url] = currentValue || '';
      });
      if (Object.keys(dataToSave).length === 0) {
        toast.info('Nenhuma configuração encontrada para salvar');
        return;
      }
      const success = await saveMultipleOptions(dataToSave);
      if (success) {
        toast.success('Configurações de funcionalidade salvas com sucesso!');
      } else {
        toast.error('Erro ao salvar configurações de funcionalidade');
      }
    } catch (error) {
      console.error('Erro ao salvar configurações de funcionalidade:', error);
      toast.error('Erro ao salvar configurações de funcionalidade');
    } finally {
      setIsLoading(false);
    }
  };

  

  /**
   * Salva configurações gerais
   */
  const handleSaveGeneralSettings = () => {
    localStorage.setItem('basicSwitchSettings', JSON.stringify(basicSwitchSettings));
    applySystemSettings(basicSwitchSettings);
    toast.success('Configurações gerais salvas!');
  };

  /**
   * Salva preferências do sistema
   */
  const handleSaveSystemPreferences = () => {
    localStorage.setItem('basicSelectSettings', JSON.stringify(basicSelectSettings));
    toast.success('Preferências do sistema salvas!');
  };

  /**
   * Manipula mudanças nos switches das configurações avançadas
   */
  const handleAdvancedSwitchChange = (key: string, value: boolean) => {
    setAdvancedSwitchSettings(prev => ({ ...prev, [key]: value }));
  };

  /**
   * Manipula mudanças nos selects das configurações avançadas
   */
  const handleAdvancedSelectChange = (key: string, value: string) => {
    setAdvancedSelectSettings(prev => ({ ...prev, [key]: value }));
  };

  /**
   * Manipula mudanças nos inputs das configurações avançadas
   */
  const handleAdvancedInputChange = (key: string, value: string) => {
    setAdvancedInputSettings(prev => ({ ...prev, [key]: value }));
  };

  /**
   * Salva todas as configurações
   */
  const handleSaveSettings = async () => {
    try {
      // Prepara as configurações avançadas para envio à API
      const advancedSettings: AdvancedSystemSettings = {
        // Configurações com Switch
        enableApiLogging: advancedSwitchSettings.enableApiLogging,
        enableCaching: advancedSwitchSettings.enableCaching,
        enableCompression: advancedSwitchSettings.enableCompression,
        enableSslRedirect: advancedSwitchSettings.enableSslRedirect,
        
        // Configurações com Select
        logLevel: advancedSelectSettings.logLevel,
        cacheDriver: advancedSelectSettings.cacheDriver,
        sessionDriver: advancedSelectSettings.sessionDriver,
        queueDriver: advancedSelectSettings.queueDriver,
        
        // Configurações com Input
        maxFileSize: advancedInputSettings.maxFileSize,
        sessionTimeout: advancedInputSettings.sessionTimeout,
        apiRateLimit: advancedInputSettings.apiRateLimit,
        maxConnections: advancedInputSettings.maxConnections,
        backupRetention: advancedInputSettings.backupRetention,
        url_api_aeroclube: advancedInputSettings.url_api_aeroclube,
        token_api_aeroclube: advancedInputSettings.token_api_aeroclube,
      };

      // Envia as configurações avançadas para a API na rota /options
      await systemSettingsService.saveAdvancedSettings(advancedSettings);
      
      // Log das outras configurações (não enviadas para API ainda)
      // console.log('Configurações Básicas - Switch:', basicSwitchSettings);
      // console.log('Configurações Básicas - Select:', basicSelectSettings);
      // console.log('Configurações de Aparência:', appearanceSettings);
      // console.log('Configurações Avançadas enviadas para API:', advancedSettings);
      
      toast.success("Configurações salvas com sucesso!");
    } catch (error) {
      console.error('Erro ao salvar configurações:', error);
      toast.error("Erro ao salvar configurações. Tente novamente.");
    }
  };

  /**
   * Handle Import Users from URL
   */
  /**
   * Handle Import Users from URL
   */
  const handleImportUsers = async () => {
    const url = advancedInputSettings.import_users_url;
    const type = advancedInputSettings.import_type || 'users';

    if (!url) {
      toast.error('Por favor, informe a URL de importação.');
      return;
    }
    
    setIsLoading(true);
    try {
        const result = await systemSettingsService.importUsers(url, type);
        
        if (result.success) {
            toast.success(result.message || 'Importação realizada com sucesso!');
        } else {
            toast.error(result.message || 'Erro na importação.');
        }

    } catch (error: any) {
        console.error('Import exception:', error);
        toast.error(`Erro ao importar: ${error.message || 'Erro desconhecido'}`);
    } finally {
        setIsLoading(false);
    }
  };

  /**
   * Carrega as configurações avançadas da API
   */
  const loadAdvancedSettings = async () => {
    try {
      setIsLoading(true);
      const data = await systemSettingsService.getAdvancedSettings('/options');
      console.log('data',data);
      
      // Atualiza o estado com os dados da API
      setAdvancedInputSettings({
        maxFileSize: data.maxFileSize || "",
        sessionTimeout: data.sessionTimeout || "",
        apiRateLimit: data.apiRateLimit || "",
        maxConnections: data.maxConnections || "",
        backupRetention: data.backupRetention || "",
        url_api_aeroclube: data.url_api_aeroclube || "",
        token_api_aeroclube: data.token_api_aeroclube || "",
        import_users_url: "", // Not saved in backend settings typically, reset to empty
        import_type: "users",
      });
      
      // Também atualiza as outras configurações se necessário
      if (data.enableApiLogging !== undefined) {
        setAdvancedSwitchSettings(prev => ({
          ...prev,
          enableApiLogging: data.enableApiLogging,
          enableCaching: data.enableCaching,
          enableCompression: data.enableCompression,
          enableSslRedirect: data.enableSslRedirect,
        }));
      }
      
      if (data.logLevel) {
        setAdvancedSelectSettings(prev => ({
          ...prev,
          logLevel: data.logLevel,
          cacheDriver: data.cacheDriver,
          sessionDriver: data.sessionDriver,
          queueDriver: data.queueDriver,
        }));
      }
      
    } catch (error) {
      console.error('Erro ao carregar configurações:', error);
      toast.error('Erro ao carregar configurações da API');
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * useEffect para carregar as configurações ao montar o componente
   */
  useEffect(() => {
    loadAdvancedSettings();
  }, []);

  const whatsappMaskRef = useMask({ mask: '+__ (__) _____-____', replacement: { _: /\d/ } });

  if (permissionId > 2) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4 animate-in fade-in zoom-in-95 duration-500">
        <div className="h-24 w-24 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center text-red-600 dark:text-red-400 shadow-xl shadow-red-500/10">
          <ShieldCheck className="h-12 w-12" />
        </div>
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-black tracking-tight text-foreground">Acesso Restrito</h1>
          <p className="text-muted-foreground text-sm font-medium max-w-[300px] mx-auto">
            Sua conta não possui privilégios suficientes para visualizar ou editar as configurações do sistema.
          </p>
        </div>
        <Button 
          variant="outline" 
          onClick={() => window.history.back()}
          className="mt-4 rounded-xl px-8 font-bold border-2"
        >
          Voltar para Segurança
        </Button>
      </div>
    );
  }

  const isRestrictedLevel = permissionId === 2;

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-700 pb-20">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-muted-foreground/60">
            <Settings className="h-3 w-3" />
            Configurações
            <span className="text-primary/40">•</span>
            <span className="text-primary italic">Sistema</span>
          </div>
          <h1 className="text-3xl font-black tracking-tight text-foreground flex items-center gap-3">
            <Settings className="h-8 w-8 text-primary" />
            Configurações do Sistema
          </h1>
          <p className="text-sm font-medium text-muted-foreground">Gerencie as preferências globais, aparência e infraestrutura da sua escola.</p>
        </div>
        
        {activeTab === "advanced" && (
          <Button 
            onClick={handleSaveSettings}
            className="h-12 px-6 rounded-xl bg-primary hover:bg-primary/90 text-white font-black shadow-lg shadow-primary/20 flex items-center gap-2 transition-all hover:scale-105 active:scale-95"
          >
            <Save className="h-5 w-5" />
            Salvar Configurações
          </Button>
        )}
      </div>

      <Tabs defaultValue="basic" className="w-full" onValueChange={setActiveTab}>
        <div className="p-1 bg-slate-100/50 dark:bg-slate-800/50 backdrop-blur-xl rounded-2xl w-fit mb-8 border border-slate-200/50 dark:border-slate-700/50">
          <TabsList className="bg-transparent h-12 gap-1 p-0">
            <TabsTrigger 
              value="basic" 
              className="rounded-xl px-6 h-10 font-bold data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-sm transition-all gap-2"
            >
              <Palette className="h-4 w-4" />
              Básicas
            </TabsTrigger>
            
            {!isRestrictedLevel && (
              <>
                <TabsTrigger 
                  value="advanced" 
                  className="rounded-xl px-6 h-10 font-bold data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-sm transition-all gap-2"
                >
                  <ShieldCheck className="h-4 w-4" />
                  Avançadas
                </TabsTrigger>
                <TabsTrigger 
                  value="api" 
                  className="rounded-xl px-6 h-10 font-bold data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-sm transition-all gap-2"
                >
                  <Link className="h-4 w-4" />
                  API & Integrações
                </TabsTrigger>
              </>
            )}
          </TabsList>
        </div>

        <TabsContent value="basic" className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
          {/* Card de Configurações de Aparência */}
          <Card className="border-none shadow-2xl bg-white/50 dark:bg-slate-900/50 backdrop-blur-xl rounded-3xl overflow-hidden">
            <CardHeader className="p-8 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-600 shadow-sm">
                  <Palette className="h-6 w-6" />
                </div>
                <div>
                  <CardTitle className="text-xl font-black tracking-tight">Estilo & Aparência</CardTitle>
                  <CardDescription className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 leading-none mt-1">
                    Personalize a identidade visual da plataforma
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Switches de Aparência */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="darkMode">Modo Escuro</Label>
                    <p className="text-sm text-muted-foreground">
                      Ativar tema escuro para reduzir o cansaço visual
                    </p>
                  </div>
                  <Switch
                    id="darkMode"
                    checked={appearanceSettings.darkMode}
                    onCheckedChange={(value) => handleAppearanceChange('darkMode', value)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="compactMode">Modo Compacto</Label>
                    <p className="text-sm text-muted-foreground">
                      Reduzir espaçamentos para mostrar mais conteúdo
                    </p>
                  </div>
                  <Switch
                    id="compactMode"
                    checked={appearanceSettings.compactMode}
                    onCheckedChange={(value) => handleAppearanceChange('compactMode', value)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="showAnimations">Animações</Label>
                    <p className="text-sm text-muted-foreground">
                      Habilitar animações e transições na interface
                    </p>
                  </div>
                  <Switch
                    id="showAnimations"
                    checked={appearanceSettings.showAnimations}
                    onCheckedChange={(value) => handleAppearanceChange('showAnimations', value)}
                  />
                </div>
              </div>

              {/* Configurações de Cores e Tema */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="primaryColor">Cor Primária</Label>
                  <div className="flex space-x-2">
                    <div 
                      className="w-10 h-10 rounded border shadow-sm"
                      style={{ backgroundColor: appearanceSettings.primaryColor }}
                    />
                    <Input 
                      id="primaryColor" 
                      value={appearanceSettings.primaryColor}
                      onChange={(e) => handleAppearanceChange('primaryColor', e.target.value)}
                      placeholder="#000000"
                      className="flex-1"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="primaryTextColor">Cor Texto Primário</Label>
                  <div className="flex space-x-2">
                    <div 
                      className="w-10 h-10 rounded border shadow-sm"
                      style={{ backgroundColor: appearanceSettings.primaryTextColor || '#ffffff' }}
                    />
                    <Input 
                      id="primaryTextColor" 
                      value={appearanceSettings.primaryTextColor || '#ffffff'}
                      onChange={(e) => handleAppearanceChange('primaryTextColor', e.target.value)}
                      placeholder="#ffffff"
                      className="flex-1"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="secondaryColor">Cor Secundária</Label>
                  <div className="flex space-x-2">
                    <div 
                      className="w-10 h-10 rounded border shadow-sm"
                      style={{ backgroundColor: appearanceSettings.secondaryColor }}
                    />
                    <Input 
                      id="secondaryColor" 
                      value={appearanceSettings.secondaryColor}
                      onChange={(e) => handleAppearanceChange('secondaryColor', e.target.value)}
                      placeholder="#000000"
                      className="flex-1"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="secondaryTextColor">Cor Texto Secundário</Label>
                  <div className="flex space-x-2">
                    <div 
                      className="w-10 h-10 rounded border shadow-sm"
                      style={{ backgroundColor: appearanceSettings.secondaryTextColor || '#ffffff' }}
                    />
                    <Input 
                      id="secondaryTextColor" 
                      value={appearanceSettings.secondaryTextColor || '#ffffff'}
                      onChange={(e) => handleAppearanceChange('secondaryTextColor', e.target.value)}
                      placeholder="#ffffff"
                      className="flex-1"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="hoverColor">Cor de Hover</Label>
                  <div className="flex items-center space-x-2">
                    <Input
                      id="hoverColor"
                      type="color"
                      value={appearanceSettings.hoverColor}
                      onChange={(e) => handleAppearanceChange('hoverColor', e.target.value)}
                      className="w-16 h-10 p-1 border rounded"
                    />
                    <Input
                      type="text"
                      value={appearanceSettings.hoverColor}
                      onChange={(e) => handleAppearanceChange('hoverColor', e.target.value)}
                      placeholder="#0056b3"
                      className="flex-1"
                    />
                  </div>
                </div>
              </div>

              {/* Selects de Aparência */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="theme">Tema</Label>
                  <Select
                    value={appearanceSettings.theme}
                    onValueChange={(value) => handleAppearanceChange('theme', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o tema" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="default">Padrão</SelectItem>
                      <SelectItem value="modern">Moderno</SelectItem>
                      <SelectItem value="classic">Clássico</SelectItem>
                      <SelectItem value="minimal">Minimalista</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="fontSize">Tamanho da Fonte</Label>
                  <Select
                    value={appearanceSettings.fontSize}
                    onValueChange={(value) => handleAppearanceChange('fontSize', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o tamanho" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="small">Pequena</SelectItem>
                      <SelectItem value="medium">Média</SelectItem>
                      <SelectItem value="large">Grande</SelectItem>
                      <SelectItem value="extra-large">Extra Grande</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              {/* Botão de salvamento do card de aparência */}
              <div className="flex justify-end pt-4 border-t">
                <Button onClick={handleSaveAppearanceSettings} className="flex items-center space-x-2">
                  <Save className="h-4 w-4" />
                  <span>Salvar Aparência</span>
                </Button>
              </div>
          </CardContent>
        </Card>
          {/* Card - Identidade Institucional */}
          <Card className="border-none shadow-2xl bg-white/50 dark:bg-slate-900/50 backdrop-blur-xl rounded-3xl overflow-hidden mt-8">
            <CardHeader className="p-8 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-2xl bg-blue-500/10 flex items-center justify-center text-blue-600 shadow-sm">
                  <Building2 className="h-6 w-6" />
                </div>
                <div>
                  <CardTitle className="text-xl font-black tracking-tight">Identidade Institucional</CardTitle>
                  <CardDescription className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 leading-none mt-1">
                    Cadastre as informações da sua organização
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="institution_name">Nome da instituição</Label>
              <Input
                id="institution_name"
                type="text"
                value={institutionName}
                onChange={(e) => setInstitutionName(e.target.value)}
                placeholder="Ex.: Aeroclube de Juiz de Fora"
              />
              <p className="text-sm text-muted-foreground">
                Este nome aparecerá na página inicial e em áreas públicas.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="institution_slogan">Slogan</Label>
                <Input
                  id="institution_slogan"
                  type="text"
                  value={institutionSlogan}
                  onChange={(e) => setInstitutionSlogan(e.target.value)}
                  placeholder="Ex.: Educação que transforma"
                />
                <p className="text-sm text-muted-foreground">Usado em títulos e metatags sociais.</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="institution_url">URL institucional</Label>
                <Input
                  id="institution_url"
                  type="url"
                  value={institutionUrl}
                  onChange={(e) => setInstitutionUrl(e.target.value)}
                  placeholder="https://www.seu-dominio.com"
                />
                <p className="text-sm text-muted-foreground">Link oficial do site ou página institucional.</p>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="institution_description">Descrição curta</Label>
              <Input
                id="institution_description"
                type="text"
                value={institutionDescription}
                onChange={(e) => setInstitutionDescription(e.target.value)}
                placeholder="Resumo curto para metatags e SEO"
              />
              <p className="text-sm text-muted-foreground">Aparece em descrição e OpenGraph/Twitter.</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="institution_whatsapp">WhatsApp da Empresa</Label>
              <Input
                ref={whatsappMaskRef}
                id="institution_whatsapp"
                type="text"
                value={institutionWhatsApp}
                onChange={(e) => setInstitutionWhatsApp(e.target.value)}
                placeholder="+55 (99) 99999-9999"
              />
              <p className="text-sm text-muted-foreground">Número para contato via WhatsApp (com DDI, ex: +55).</p>
            </div>
            <div className="flex justify-end pt-6 border-t border-slate-100 dark:border-slate-800 p-8">
              <Button 
                onClick={handleSaveInstitution}
                className="h-11 px-6 rounded-xl bg-slate-900 dark:bg-slate-100 dark:text-slate-900 text-white font-bold flex items-center gap-2 transition-all hover:scale-105 active:scale-95 shadow-lg shadow-slate-900/10"
              >
                <Save className="h-4 w-4" />
                Salvar Instituição
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Card - Branding & Imagens */}
        <Card className="border-none shadow-2xl bg-white/50 dark:bg-slate-900/50 backdrop-blur-xl rounded-3xl overflow-hidden mt-8">
          <CardHeader className="p-8 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-600 shadow-sm">
                <ImageIcon className="h-6 w-6" />
              </div>
              <div>
                <CardTitle className="text-xl font-black tracking-tight">Branding & Imagens</CardTitle>
                <CardDescription className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 leading-none mt-1">
                  Logo, Favicon e Imagens de Compartilhamento
                </CardDescription>
              </div>
            </div>
          </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <Label>Logo</Label>
                  <ImageUpload
                    name="app_logo"
                    label="Logo"
                    value={brandingLogoUrl || ''}
                    onChange={(val) => setBrandingLogoUrl(val || null)}
                    onUpload={handleUploadLogo}
                    acceptedTypes={["image/png", "image/jpeg", "image/webp", "image/svg+xml"]}
                    className="max-w-xs"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Favicon</Label>
                  <ImageUpload
                    name="app_favicon"
                    label="Favicon"
                    value={brandingFaviconUrl || ''}
                    onChange={(val) => setBrandingFaviconUrl(val || null)}
                    onUpload={handleUploadFavicon}
                    acceptedTypes={["image/png", "image/x-icon", "image/svg+xml"]}
                    className="max-w-xs"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Imagem Social (OpenGraph/Twitter)</Label>
                  <ImageUpload
                    name="app_social_image"
                    label="Imagem Social"
                    value={brandingSocialUrl || ''}
                    onChange={(val) => setBrandingSocialUrl(val || null)}
                    onUpload={handleUploadSocial}
                    acceptedTypes={["image/png", "image/jpeg", "image/webp"]}
                    className="max-w-xs"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-6 border-t border-slate-100 dark:border-slate-800 p-8">
                <Button 
                  onClick={handleSaveBranding}
                  className="h-11 px-6 rounded-xl bg-slate-900 dark:bg-slate-100 dark:text-slate-900 text-white font-bold flex items-center gap-2 transition-all hover:scale-105 active:scale-95 shadow-lg shadow-slate-900/10"
                >
                  <Save className="h-4 w-4" />
                  Salvar Branding
                </Button>
              </div>
            </CardContent>
          </Card>
          {/* Card 1 - Configurações com Switch */}
          <Card className="border-none shadow-2xl bg-white/50 dark:bg-slate-900/50 backdrop-blur-xl rounded-3xl overflow-hidden mt-8">
            <CardHeader className="p-8 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shadow-sm">
                  <Settings className="h-6 w-6" />
                </div>
                <div>
                  <CardTitle className="text-xl font-black tracking-tight">Configurações Gerais</CardTitle>
                  <CardDescription className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 leading-none mt-1">
                    Operações básicas e manutenção do sistema
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="enableNotifications">Habilitar Notificações</Label>
                  <p className="text-sm text-muted-foreground">
                    Receba notificações sobre eventos importantes do sistema
                  </p>
                </div>
                <Switch
                  id="enableNotifications"
                  checked={basicSwitchSettings.enableNotifications}
                  onCheckedChange={(value) => handleBasicSwitchChange('enableNotifications', value)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="enableAutoBackup">Backup Automático</Label>
                  <p className="text-sm text-muted-foreground">
                    Realizar backup automático dos dados diariamente
                  </p>
                </div>
                <Switch
                  id="enableAutoBackup"
                  checked={basicSwitchSettings.enableAutoBackup}
                  onCheckedChange={(value) => handleBasicSwitchChange('enableAutoBackup', value)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="enableMaintenanceMode">Modo de Manutenção</Label>
                  <p className="text-sm text-muted-foreground">
                    Ativar modo de manutenção para usuários externos
                  </p>
                </div>
                <Switch
                  id="enableMaintenanceMode"
                  checked={basicSwitchSettings.enableMaintenanceMode}
                  onCheckedChange={(value) => handleBasicSwitchChange('enableMaintenanceMode', value)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="enableDebugMode">Modo Debug</Label>
                  <p className="text-sm text-muted-foreground">
                    Habilitar logs detalhados para depuração
                  </p>
                </div>
                <Switch
                  id="enableDebugMode"
                  checked={basicSwitchSettings.enableDebugMode}
                  onCheckedChange={(value) => handleBasicSwitchChange('enableDebugMode', value)}
                />
              </div>
              
              <div className="flex justify-end pt-6 border-t border-slate-100 dark:border-slate-800 p-8">
                <Button 
                  onClick={handleSaveGeneralSettings}
                  className="h-11 px-6 rounded-xl bg-slate-900 dark:bg-slate-100 dark:text-slate-900 text-white font-bold flex items-center gap-2 transition-all hover:scale-105 active:scale-95 shadow-lg shadow-slate-900/10"
                >
                  <Save className="h-4 w-4" />
                  Salvar Configurações Gerais
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Card 2 - Configurações com Select - Preferências Regionais */}
          {!isRestrictedLevel && (
            <Card className="border-none shadow-2xl bg-white/50 dark:bg-slate-900/50 backdrop-blur-xl rounded-3xl overflow-hidden mt-8">
              <CardHeader className="p-8 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-600 shadow-sm">
                    <Layers className="h-6 w-6" />
                  </div>
                  <div>
                    <CardTitle className="text-xl font-black tracking-tight">Preferências Regionais</CardTitle>
                    <CardDescription className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 leading-none mt-1">
                      Idioma, Fuso Horário e Moeda
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="defaultLanguage">Idioma Padrão</Label>
                  <Select
                    value={basicSelectSettings.defaultLanguage}
                    onValueChange={(value) => handleBasicSelectChange('defaultLanguage', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o idioma" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pt-BR">Português (Brasil)</SelectItem>
                      <SelectItem value="en-US">English (US)</SelectItem>
                      <SelectItem value="es-ES">Español</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="timezone">Fuso Horário</Label>
                  <Select
                    value={basicSelectSettings.timezone}
                    onValueChange={(value) => handleBasicSelectChange('timezone', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o fuso horário" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="America/Sao_Paulo">São Paulo (GMT-3)</SelectItem>
                      <SelectItem value="America/New_York">New York (GMT-5)</SelectItem>
                      <SelectItem value="Europe/London">London (GMT+0)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="dateFormat">Formato de Data</Label>
                  <Select
                    value={basicSelectSettings.dateFormat}
                    onValueChange={(value) => handleBasicSelectChange('dateFormat', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o formato" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="DD/MM/YYYY">DD/MM/YYYY</SelectItem>
                      <SelectItem value="MM/DD/YYYY">MM/DD/YYYY</SelectItem>
                      <SelectItem value="YYYY-MM-DD">YYYY-MM-DD</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="currency">Moeda Padrão</Label>
                  <Select
                    value={basicSelectSettings.currency}
                    onValueChange={(value) => handleBasicSelectChange('currency', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a moeda" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="BRL">Real (R$)</SelectItem>
                      <SelectItem value="USD">Dólar ($)</SelectItem>
                      <SelectItem value="EUR">Euro (€)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="flex justify-end pt-6 border-t border-slate-100 dark:border-slate-800 p-8">
                  <Button 
                    onClick={handleSaveSystemPreferences}
                    className="h-11 px-6 rounded-xl bg-slate-900 dark:bg-slate-100 dark:text-slate-900 text-white font-bold flex items-center gap-2 transition-all hover:scale-105 active:scale-95 shadow-lg shadow-slate-900/10"
                  >
                    <Save className="h-4 w-4" />
                    Salvar Preferências
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Aba de Configurações Avançadas */}
        <TabsContent value="advanced" className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
          {/* Card 1 - Configurações com Switch */}
          <Card className="border-none shadow-2xl bg-white/50 dark:bg-slate-900/50 backdrop-blur-xl rounded-3xl overflow-hidden">
            <CardHeader className="p-8 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shadow-sm">
                  <ShieldCheck className="h-6 w-6" />
                </div>
                <div>
                  <CardTitle className="text-xl font-black tracking-tight">Drivers & Performance</CardTitle>
                  <CardDescription className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 leading-none mt-1">
                    Otimização e Segurança do Core
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="enableApiLogging">Log de API</Label>
                  <p className="text-sm text-muted-foreground">
                    Registrar todas as chamadas de API para auditoria
                  </p>
                </div>
                <Switch
                  id="enableApiLogging"
                  checked={advancedSwitchSettings.enableApiLogging}
                  onCheckedChange={(value) => handleAdvancedSwitchChange('enableApiLogging', value)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="enableCaching">Cache do Sistema</Label>
                  <p className="text-sm text-muted-foreground">
                    Habilitar cache para melhorar performance
                  </p>
                </div>
                <Switch
                  id="enableCaching"
                  checked={advancedSwitchSettings.enableCaching}
                  onCheckedChange={(value) => handleAdvancedSwitchChange('enableCaching', value)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="enableCompression">Compressão GZIP</Label>
                  <p className="text-sm text-muted-foreground">
                    Comprimir respostas HTTP para reduzir largura de banda
                  </p>
                </div>
                <Switch
                  id="enableCompression"
                  checked={advancedSwitchSettings.enableCompression}
                  onCheckedChange={(value) => handleAdvancedSwitchChange('enableCompression', value)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="enableSslRedirect">Redirecionamento SSL</Label>
                  <p className="text-sm text-muted-foreground">
                    Forçar redirecionamento para HTTPS
                  </p>
                </div>
                <Switch
                  id="enableSslRedirect"
                  checked={advancedSwitchSettings.enableSslRedirect}
                  onCheckedChange={(value) => handleAdvancedSwitchChange('enableSslRedirect', value)}
                />
              </div>
            </CardContent>
          </Card>

          {/* Card 2 - Configurações com Select */}
          <Card className="border-none shadow-2xl bg-white/50 dark:bg-slate-900/50 backdrop-blur-xl rounded-3xl overflow-hidden mt-8">
            <CardHeader className="p-8 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-600 shadow-sm">
                  <Layers className="h-6 w-6" />
                </div>
                <div>
                  <CardTitle className="text-xl font-black tracking-tight">Infraestrutura do Servidor</CardTitle>
                  <CardDescription className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 leading-none mt-1">
                    Drivers de Cache, Sessão e Filas
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="logLevel">Nível de Log</Label>
                <Select
                  value={advancedSelectSettings.logLevel}
                  onValueChange={(value) => handleAdvancedSelectChange('logLevel', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o nível" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="debug">Debug</SelectItem>
                    <SelectItem value="info">Info</SelectItem>
                    <SelectItem value="warning">Warning</SelectItem>
                    <SelectItem value="error">Error</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="cacheDriver">Driver de Cache</Label>
                <Select
                  value={advancedSelectSettings.cacheDriver}
                  onValueChange={(value) => handleAdvancedSelectChange('cacheDriver', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o driver" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="redis">Redis</SelectItem>
                    <SelectItem value="memcached">Memcached</SelectItem>
                    <SelectItem value="file">File</SelectItem>
                    <SelectItem value="database">Database</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="sessionDriver">Driver de Sessão</Label>
                <Select
                  value={advancedSelectSettings.sessionDriver}
                  onValueChange={(value) => handleAdvancedSelectChange('sessionDriver', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o driver" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="database">Database</SelectItem>
                    <SelectItem value="redis">Redis</SelectItem>
                    <SelectItem value="file">File</SelectItem>
                    <SelectItem value="cookie">Cookie</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="queueDriver">Driver de Fila</Label>
                <Select
                  value={advancedSelectSettings.queueDriver}
                  onValueChange={(value) => handleAdvancedSelectChange('queueDriver', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o driver" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sync">Sync</SelectItem>
                    <SelectItem value="redis">Redis</SelectItem>
                    <SelectItem value="database">Database</SelectItem>
                    <SelectItem value="sqs">Amazon SQS</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Card 3 - Configurações com Input */}
          <Card className="border-none shadow-2xl bg-white/50 dark:bg-slate-900/50 backdrop-blur-xl rounded-3xl overflow-hidden mt-8">
            <CardHeader className="p-8 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-600 shadow-sm">
                  <Clock className="h-6 w-6" />
                </div>
                <div>
                  <CardTitle className="text-xl font-black tracking-tight">Limites & Timeouts</CardTitle>
                  <CardDescription className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 leading-none mt-1">
                    Configurações de fluxo e retenção
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="maxFileSize">Tamanho Máximo de Arquivo (MB)</Label>
                <Input
                  id="maxFileSize"
                  type="number"
                  value={advancedInputSettings.maxFileSize}
                  onChange={(e) => handleAdvancedInputChange('maxFileSize', e.target.value)}
                  placeholder="10"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="sessionTimeout">Timeout de Sessão (minutos)</Label>
                <Input
                  id="sessionTimeout"
                  type="number"
                  value={advancedInputSettings.sessionTimeout}
                  onChange={(e) => handleAdvancedInputChange('sessionTimeout', e.target.value)}
                  placeholder="120"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="apiRateLimit">Limite de Taxa da API (req/min)</Label>
                <Input
                  id="apiRateLimit"
                  type="number"
                  value={advancedInputSettings.apiRateLimit}
                  onChange={(e) => handleAdvancedInputChange('apiRateLimit', e.target.value)}
                  placeholder="1000"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="maxConnections">Máximo de Conexões Simultâneas</Label>
                <Input
                  id="maxConnections"
                  type="number"
                  value={advancedInputSettings.maxConnections}
                  onChange={(e) => handleAdvancedInputChange('maxConnections', e.target.value)}
                  placeholder="100"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="backupRetention">Retenção de Backup (dias)</Label>
                <Input
                  id="backupRetention"
                  type="number"
                  value={advancedInputSettings.backupRetention}
                  onChange={(e) => handleAdvancedInputChange('backupRetention', e.target.value)}
                  placeholder="30"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="url_api_aeroclube">URL da api das propostas</Label>
                <Input
                  id="url_api_aeroclube"
                  type="text"
                  value={advancedInputSettings.url_api_aeroclube}
                  onChange={(e) => handleAdvancedInputChange('url_api_aeroclube', e.target.value)}
                  placeholder="http://localhost:3000"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="token_api_aeroclube">Token de acesso da API</Label>
                <Input
                  id="token_api_aeroclube"
                  type="text"
                  value={advancedInputSettings.token_api_aeroclube}
                  onChange={(e) => handleAdvancedInputChange('token_api_aeroclube', e.target.value)}
                  placeholder="token da api"
                />
              </div>
              
            </CardContent>
          </Card>

           {/* Card de Importação de Usuários */}
           <Card className="border-none shadow-2xl bg-white/50 dark:bg-slate-900/50 backdrop-blur-xl rounded-3xl overflow-hidden mt-8">
            <CardHeader className="p-8 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-600 shadow-sm">
                  <MonitorPlay className="h-6 w-6" />
                </div>
                <div>
                  <CardTitle className="text-xl font-black tracking-tight">Importação em Massa</CardTitle>
                  <CardDescription className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 leading-none mt-1">
                    Sincronização com Propostas Externas
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                 <div className="md:col-span-1 space-y-2">
                    <Label htmlFor="import_type">Tipo de Importação</Label>
                    <Select
                        value={advancedInputSettings.import_type}
                        onValueChange={(val) => handleAdvancedInputChange('import_type', val)}
                    >
                        <SelectTrigger id="import_type">
                            <SelectValue placeholder="Selecione..." />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="users">Usuários (Users)</SelectItem>
                            <SelectItem value="courses">Cursos (Courses)</SelectItem>
                            <SelectItem value="comments">Comentários (Comments)</SelectItem>
                            <SelectItem value="enrollments">Matrículas (Enrollments)</SelectItem>
                        </SelectContent>
                    </Select>
                 </div>
                 <div className="md:col-span-3 space-y-2">
                    <Label htmlFor="import_users_url">URL do JSON</Label>
                    <div className="flex gap-2">
                        <Input
                        id="import_users_url"
                        value={advancedInputSettings.import_users_url}
                        onChange={(e) => handleAdvancedInputChange('import_users_url', e.target.value)}
                        placeholder="https://exemplo.com/wp-json/..."
                        className="flex-1"
                        />
                        <Button onClick={handleImportUsers} disabled={isLoading}>
                            {isLoading ? 'Importando...' : 'Importar Agora'}
                        </Button>
                    </div>
                 </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Selecione o tipo de entidade (Usuários, Cursos, Comentários ou Matrículas) e forneça a URL correspondente.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Aba de Configurações de API */}
        <TabsContent value="api" className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
          <Card className="border-none shadow-2xl bg-white/50 dark:bg-slate-900/50 backdrop-blur-xl rounded-3xl overflow-hidden">
            <CardHeader className="p-8 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shadow-sm">
                  <Link className="h-6 w-6" />
                </div>
                <div>
                  <CardTitle className="text-xl font-black tracking-tight">API & Integrações</CardTitle>
                  <CardDescription className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 leading-none mt-1">
                    Conectividade e Ferramentas Externas
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {apiLoading ? (
                <div className="flex items-center justify-center p-8">
                  <div className="text-muted-foreground">Carregando configurações...</div>
                </div>
              ) : apiError ? (
                <div className="flex items-center justify-center p-8">
                  <div className="text-red-500">{apiError}</div>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4">
                  {getApiConfigOptions().map((option) => (
                    <div key={option.id} className="space-y-2">
                      <Label htmlFor={`api-option-${option.id}`}>
                        {option.name}
                      </Label>
                      <Input
                         id={`api-option-${option.id}`}
                         type="text"
                         name={option.url}
                         value={getCurrentOptionValue(option)}
                         onChange={(e) => handleApiOptionChange(option.id, e.target.value)}
                         placeholder={`Digite ${option.name.toLowerCase()}`}
                         className="w-full"
                       />
                      {option.obs && (
                        <p className="text-sm text-muted-foreground">
                          {option.obs}
                        </p>
                      )}
                    </div>
                  ))}
                  
                  {getApiConfigOptions().length === 0 && (
                     <div className="text-center p-8 text-muted-foreground">
                       Nenhuma configuração de API encontrada.
                     </div>
                   )}
                 </div>
               )}
               
                {/* Botão de Salvar */}
                {getApiConfigOptions().length > 0 && (
                  <div className="flex justify-end pt-6 border-t border-slate-100 dark:border-slate-800 p-8">
                    <Button 
                      onClick={handleSaveApiSettings}
                      disabled={isLoading || Object.keys(localApiOptions).length === 0}
                      className="h-11 px-6 rounded-xl bg-slate-900 dark:bg-slate-100 dark:text-slate-900 text-white font-bold flex items-center gap-2 transition-all hover:scale-105 active:scale-95 shadow-lg shadow-slate-900/10"
                    >
                      <Save className="h-4 w-4" />
                      {isLoading ? 'Salvando...' : 'Salvar Configurações de API'}
                    </Button>
                  </div>
                )}
           </CardContent>
          </Card>

          {/* Card - Configurações de Funcionalidade */}
          <Card className="border-none shadow-2xl bg-white/50 dark:bg-slate-900/50 backdrop-blur-xl rounded-3xl overflow-hidden mt-8">
            <CardHeader className="p-8 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-600 shadow-sm">
                  <Settings className="h-6 w-6" />
                </div>
                <div>
                  <CardTitle className="text-xl font-black tracking-tight">Recursos da Plataforma</CardTitle>
                  <CardDescription className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 leading-none mt-1">
                    IDs de Funis, Etapas e Tokens Globais
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {apiLoading ? (
                <div className="flex items-center justify-center p-8">
                  <div className="text-muted-foreground">Carregando configurações...</div>
                </div>
              ) : apiError ? (
                <div className="flex items-center justify-center p-8">
                  <div className="text-red-500">{apiError}</div>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4">
                  {(apiOptions || []).map((option: any) => (
                    <div key={option.id} className="space-y-2">
                      <Label htmlFor={`func-option-${option.id}`}>{option.name}</Label>
                      {option.url === 'default_funil_vendas_id' ? (
                        <Select
                          value={String(getCurrentOptionValue(option) || '')}
                          onValueChange={(val) => {
                            handleApiOptionChange(option.id, val);
                            if (defaultStageOption) {
                              handleApiOptionChange(defaultStageOption.id, '');
                            }
                          }}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Selecione o funil de vendas" />
                          </SelectTrigger>
                          <SelectContent>
                            {isLoadingFunnels ? (
                              <SelectItem value="__loading_funnels__" disabled>Carregando funis...</SelectItem>
                            ) : (
                              salesFunnels.map((f: any) => (
                                <SelectItem key={String(f.id)} value={String(f.id)}>
                                  {f.name}
                                </SelectItem>
                              ))
                            )}
                          </SelectContent>
                        </Select>
                      ) : option.url === 'default_etapa_vendas_id' ? (
                        <Select
                          value={String(getCurrentOptionValue(option) || '')}
                          onValueChange={(val) => handleApiOptionChange(option.id, val)}
                          disabled={!selectedDefaultFunnelId || isLoadingStages}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder={selectedDefaultFunnelId ? 'Selecione a etapa' : 'Selecione um funil primeiro'} />
                          </SelectTrigger>
                          <SelectContent>
                            {isLoadingStages ? (
                              <SelectItem value="__loading_stages__" disabled>Carregando etapas...</SelectItem>
                            ) : (
                              stagesForDefaultFunnel.map((s: any) => (
                                <SelectItem key={String(s.id)} value={String(s.id)}>
                                  {s.name}
                                </SelectItem>
                              ))
                            )}
                          </SelectContent>
                        </Select>
                      ) : (
                        <Input
                          id={`func-option-${option.id}`}
                          type="text"
                          name={option.url}
                          value={getCurrentOptionValue(option)}
                          onChange={(e) => handleApiOptionChange(option.id, e.target.value)}
                          placeholder={`Digite ${option.name.toLowerCase()}`}
                          className="w-full"
                        />
                      )}
                      {option.obs && (
                        <p className="text-sm text-muted-foreground">{option.obs}</p>
                      )}
                    </div>
                  ))}

                  {(apiOptions || []).length === 0 && (
                    <div className="text-center p-8 text-muted-foreground">Nenhuma configuração encontrada.</div>
                  )}
                </div>
              )}

              {(apiOptions || []).length > 0 && (
                <div className="flex justify-end pt-6 border-t border-slate-100 dark:border-slate-800 p-8">
                  <Button
                    onClick={handleSaveFunctionalityOptions}
                    disabled={isLoading || Object.keys(localApiOptions).length === 0}
                    className="h-11 px-6 rounded-xl bg-slate-900 dark:bg-slate-100 dark:text-slate-900 text-white font-bold flex items-center gap-2 transition-all hover:scale-105 active:scale-95 shadow-lg shadow-slate-900/10"
                  >
                    <Save className="h-4 w-4" />
                    {isLoading ? 'Salvando...' : 'Salvar Preferências Globais'}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
