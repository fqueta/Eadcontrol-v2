import { ReactNode, useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { User, LogOut, ChevronDown, Monitor, ExternalLink, Moon, Sun, Menu, Home, BookOpen, Receipt, ShoppingCart, GraduationCap, UserCircle, ShieldAlert } from "lucide-react";
import { BrandLogo } from "@/components/branding/BrandLogo";

import { applyBrandingFavicon, hydrateBrandingFromPublicApi, getInstitutionName, getInstitutionSlogan, getInstitutionDescription, getInstitutionUrl, getBrandFooterLogoUrl } from "@/lib/branding";
import { getTenantApiUrl, getVersionApi } from "@/lib/qlib";
import { ForceChangePasswordModal } from "@/components/auth/ForceChangePasswordModal";
import { FooterEditor, FooterConfig } from "@/components/site/FooterEditor";

type InclusiveSiteLayoutProps = {
  children: ReactNode;
};

/**
 * InclusiveSiteLayout
 * pt-BR: Layout compartilhado inspirado no estilo do site Incluir & Educar,
 *        com cabeçalho, navegação de usuário e rodapé institucional.
 * en-US: Shared layout inspired by Incluir & Educar website style,
 *        featuring header, user navigation and institutional footer.
 */
export function InclusiveSiteLayout({ children }: InclusiveSiteLayoutProps) {
  const { user, isAuthenticated, logout } = useAuth();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const { applyThemeSettings } = useTheme();
  const { toast } = useToast();
  const [isDark, setIsDark] = useState<boolean>(false);
  const [mobileNavOpen, setMobileNavOpen] = useState<boolean>(false);
  const [institutionName, setInstitutionName] = useState(() => getInstitutionName() || 'Instituição');
  const [institutionSlogan, setInstitutionSlogan] = useState(() => getInstitutionSlogan() || '');
  const [institutionDescription, setInstitutionDescription] = useState(() => getInstitutionDescription() || '');
  const [institutionUrl, setInstitutionUrl] = useState(() => getInstitutionUrl() || '');
  const [footerLogoUrl, setFooterLogoUrl] = useState(() => getBrandFooterLogoUrl() || '');
  const [footerConfig, setFooterConfig] = useState<FooterConfig>(() => {
    try {
      const saved = localStorage.getItem('footer_config');
      return saved ? JSON.parse(saved) : { backgroundColor: "#020617", textColor: "#94a3b8", titleColor: "#ffffff" };
    } catch {
      return { backgroundColor: "#020617", textColor: "#94a3b8", titleColor: "#ffffff" };
    }
  });
  const [isAdminImpersonating, setIsAdminImpersonating] = useState(false);
  const [headerTransparent, setHeaderTransparent] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  const location = useLocation();

  useEffect(() => {
    const checkHeaderStyle = () => {
      try {
        const saved = localStorage.getItem('appearanceSettings');
        if (saved) {
          const parsed = JSON.parse(saved);
          setHeaderTransparent(!!parsed.headerTransparent);
        }
      } catch {}
    };
    checkHeaderStyle();
    window.addEventListener('storage', checkHeaderStyle);
    return () => window.removeEventListener('storage', checkHeaderStyle);
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const isHomePage = location.pathname === '/';
  const isTransparentActive = headerTransparent && isHomePage && !scrolled;
  const [topMenuItems, setTopMenuItems] = useState<any[] | null>(() => {
    try {
      const raw = localStorage.getItem('app_top_menu');
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : null;
    } catch {
      return null;
    }
  });
  /**
   * BrandLogo usage
   * pt-BR: Substitui lógica manual por componente BrandLogo para resolver a URL
   *        automaticamente a partir de localStorage/window/env com fallback.
   * en-US: Replaces manual logic with BrandLogo component that resolves URL
   *        automatically from localStorage/window/env with fallback.
  */

  /**
   * applyBrandingFaviconOnMount
   * pt-BR: Na montagem do layout público, hidrata branding via endpoint
   *         público e aplica o favicon da marca.
   * en-US: On public layout mount, hydrate branding via public endpoint
   *         and apply brand favicon.
   */
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await hydrateBrandingFromPublicApi({ persist: true });
        if (!cancelled) {
          setInstitutionName(getInstitutionName() || 'Instituição');
          setInstitutionSlogan(getInstitutionSlogan() || '');
          setInstitutionDescription(getInstitutionDescription() || '');
          setInstitutionUrl(getInstitutionUrl() || '');
          setFooterLogoUrl(getBrandFooterLogoUrl() || '');
          applyThemeSettings();
          applyBrandingFavicon('/favicon.ico');
        }
      } catch {
        if (!cancelled) applyBrandingFavicon('/favicon.ico');
      }

      // Busca menu do topo diretamente do endpoint público
      if (!cancelled) {
        try {
          const publicUrl = `${getTenantApiUrl()}${getVersionApi()}/public/options/branding`;
          const res = await fetch(publicUrl, { cache: 'no-store' });
          if (res.ok) {
            const json = await res.json();
            const raw = json?.data?.app_top_menu;
            if (raw) {
              const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
              setTopMenuItems(Array.isArray(parsed) ? parsed : null);
            }
            const rawFooter = json?.data?.footer_config;
            if (rawFooter) {
              const parsed = typeof rawFooter === 'string' ? JSON.parse(rawFooter) : rawFooter;
              setFooterConfig(parsed);
              localStorage.setItem('footer_config', JSON.stringify(parsed));
            }
          }
        } catch {}
      }
    })();
    return () => { cancelled = true; };
  }, []);

  /**
   * checkImpersonation
   * pt-BR: Verifica se existe um token de admin salvo para exibir o banner de retorno.
   * en-US: Checks if there is a saved admin token to show the return banner.
   */
  useEffect(() => {
    setIsAdminImpersonating(!!localStorage.getItem('admin_token_snapshot'));
  }, []);

  /**
   * handleReturnToAdmin
   * pt-BR: Restaura a sessão do administrador e redireciona de volta.
   * en-US: Restores admin session and redirects back.
   */
  const handleReturnToAdmin = () => {
    const adminToken = localStorage.getItem('admin_token_snapshot');
    if (adminToken) {
      localStorage.setItem('auth_token', adminToken);
      localStorage.removeItem('admin_token_snapshot');
      // Limpa dados cacheados do aluno para forçar recarregamento do admin
      localStorage.removeItem('user_data');
      localStorage.removeItem('user_menu');
      window.location.href = '/admin';
    }
  };
  /**
   * handleLogout
   * pt-BR: Efetua logout com feedback visual.
   * en-US: Performs logout with visual feedback.
   */
  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await logout();
    } catch (error) {
      console.error("Erro ao fazer logout:", error);
    } finally {
      setIsLoggingOut(false);
    }
  };

  /**
   * toggleDarkMode
   * pt-BR: Alterna entre modo claro e escuro usando ThemeContext e localStorage.
   * en-US: Toggles light/dark mode using ThemeContext and localStorage.
   */
  const toggleDarkMode = () => {
    try {
      const saved = localStorage.getItem('appearanceSettings');
      const current = saved ? JSON.parse(saved) : {};
      const next = !document.documentElement.classList.contains('dark');
      const updated = { ...current, darkMode: next };
      localStorage.setItem('appearanceSettings', JSON.stringify(updated));
      applyThemeSettings();
      setIsDark(next);
      toast({
        title: next ? 'Modo escuro ativado' : 'Modo claro ativado',
        description: next ? 'Tema escuro aplicado com sucesso.' : 'Voltando ao tema claro.',
      });
    } catch (error) {
      console.error('Erro ao alternar tema:', error);
    }
  };

  /**
   * initThemeState
   * pt-BR: Inicializa o estado local do tema a partir do localStorage/DOM.
   * en-US: Initializes local theme state from localStorage/DOM.
   */
  useEffect(() => {
    try {
      const saved = localStorage.getItem('appearanceSettings');
      if (saved) {
        const data = JSON.parse(saved);
        if (typeof data.darkMode === 'boolean') {
          setIsDark(!!data.darkMode);
          return;
        }
      }
      setIsDark(document.documentElement.classList.contains('dark'));
    } catch {
      setIsDark(document.documentElement.classList.contains('dark'));
    }
  }, []);

  const permission_id: any = user?.permission_id;

  return (
    <div className="min-h-screen bg-background transition-colors duration-500">
      {/* Refined background elements for modern app feel */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute -top-[10%] -right-[10%] w-[40%] h-[40%] bg-blue-400/10 dark:bg-blue-600/5 blur-[120px] rounded-full" />
        <div className="absolute top-[20%] -left-[10%] w-[35%] h-[35%] bg-indigo-400/10 dark:bg-indigo-600/5 blur-[100px] rounded-full" />
      </div>

      <ForceChangePasswordModal />

      {/* Impersonation Banner */}
      {isAdminImpersonating && (
        <div className="bg-orange-600 dark:bg-orange-700 text-white py-2 px-4 shadow-lg relative z-[60] flex items-center justify-between animate-in fade-in slide-in-from-top duration-500">
          <div className="container mx-auto flex items-center justify-center gap-4 text-sm font-medium">
            <ShieldAlert className="w-4 h-4 hidden sm:block" />
            <span className="text-center">
               <span className="hidden sm:inline">Você está acessando como aluno.</span> 
               <span className="sm:ml-1 font-bold">Sessão de Personificação Ativa.</span>
            </span>
            <Button 
                size="sm" 
                variant="secondary" 
                className="bg-white text-orange-700 hover:bg-orange-50 font-bold border-none h-7 px-3 text-xs"
                onClick={handleReturnToAdmin}
            >
              Voltar para Admin
            </Button>
          </div>
        </div>
      )}

      {/* Header */}
      <header className={`z-50 transition-all duration-300 ${
        isTransparentActive
          ? "absolute top-0 left-0 right-0 bg-transparent border-transparent shadow-none"
          : "sticky top-0 bg-white/80 dark:bg-slate-950/80 backdrop-blur-xl border-b border-white/20 dark:border-slate-800/50 shadow-[0_2px_20px_-2px_rgba(0,0,0,0.03)] dark:shadow-[0_4px_30px_-5px_rgba(0,0,0,0.3)]"
      }`}>
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center space-x-3 group cursor-pointer transition-transform duration-300 hover:scale-[1.02]">
            <BrandLogo
              alt="Marca"
              fallbackSrc="https://assets.zyrosite.com/cdn-cgi/image/format=auto,w=375,fit=crop,q=95/AQExkVPy2aUDzpqL/sem-nome-250-x-125-px-4-AzGMXn77KQTvDXrP.png"
              className="h-10 p-1.5"
            />
            <div className="hidden md:block">
              <h1 className={`text-xl font-bold ${isTransparentActive ? 'text-white' : 'bg-clip-text text-transparent'}`} style={isTransparentActive ? {} : { backgroundImage: 'linear-gradient(to right, hsl(var(--primary)), var(--gradient-to, #4f46e5))' }}>{institutionName}</h1>
               {institutionSlogan && <p className={`text-[10px] uppercase tracking-wider font-bold ${isTransparentActive ? 'text-white/70' : 'text-primary/80 dark:text-blue-300/70'}`}>{institutionSlogan}</p>}
            </div>
          </div>
          {/* Mobile actions: theme toggle + menu */}
          <div className="flex md:hidden items-center gap-2">
            <Button 
              variant={isTransparentActive ? "ghost" : "outline"} 
              size="icon" 
              className={`hover:bg-white/10 ${isTransparentActive ? 'border border-white/20 text-white hover:text-white' : 'border-primary/20 text-primary hover:bg-blue-50 dark:text-blue-100 dark:border-blue-800'}`} 
              onClick={toggleDarkMode} 
              aria-label="Alternar tema"
            >
              {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </Button>
            <Button 
              variant={isTransparentActive ? "ghost" : "outline"} 
              size="icon" 
              className={`hover:bg-white/10 ${isTransparentActive ? 'border border-white/20 text-white hover:text-white' : 'border-primary/20 text-primary hover:bg-blue-50 dark:text-blue-100 dark:border-blue-800'}`} 
              onClick={() => setMobileNavOpen(true)} 
              aria-label="Abrir menu"
            >
              <Menu className="w-4 h-4" />
            </Button>
          </div>
          <div className="hidden md:flex space-x-3 items-center">
            {(topMenuItems ?? [
              { label: 'Início', url: '/', auth: false },
              { label: 'Cursos', url: '/cursos', auth: false },
              { label: 'Produtos', url: '/produtos', auth: false },
              { label: 'Área do Aluno', url: '/aluno', auth: true },
              { label: 'Site institucional', url: 'https://incluireeducar.com.br/', auth: false, external: true },
            ]).map((item: any) => {
              if (item.auth && !isAuthenticated) return null;
              const isExternal = item.external || item.url?.startsWith('http');
              return (
                <Button key={item.label + item.url} asChild variant="ghost" className={`transition-all duration-300 rounded-lg ${(() => {
                  const p = location.pathname;
                  const u = item.url;
                  const isActive = (u === '/' && p === '/') || (u !== '/' && p.startsWith(u));
                  if (isActive) {
                    return isTransparentActive ? 'bg-white/20 text-white font-bold' : 'bg-primary/10 text-primary font-bold';
                  }
                  return isTransparentActive ? 'text-white/80 hover:bg-white/10 hover:text-white' : 'text-primary dark:text-blue-100 hover:bg-primary/5 hover:text-primary';
                })()}`}>
                  {isExternal ? (
                    <a href={item.url} target="_blank" rel="noreferrer">
                      {item.external && <ExternalLink className="w-4 h-4 mr-2" />}
                      {item.label}
                    </a>
                  ) : (
                    <Link to={item.url}>{item.label}</Link>
                  )}
                </Button>
              );
            })}
            {/* Theme toggle (desktop only) */}
            <Button 
              variant={isTransparentActive ? "ghost" : "outline"} 
              className={`transition-all duration-300 rounded-lg shadow-sm ${isTransparentActive ? 'border border-white/20 text-white hover:bg-white/10 hover:text-white' : 'border-primary/20 text-primary dark:text-blue-100 dark:border-blue-800/50 hover:bg-primary/5'}`} 
              onClick={toggleDarkMode}
            >
              {isDark ? <Sun className="w-4 h-4 mr-2" /> : <Moon className="w-4 h-4 mr-2" />}
              {isDark ? 'Modo claro' : 'Modo escuro'}
            </Button>
            {isAuthenticated && user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button 
                    variant={isTransparentActive ? "ghost" : "outline"} 
                    className={`rounded-xl shadow-sm pl-2 ${isTransparentActive ? 'border border-white/20 text-white hover:bg-white/10 hover:text-white' : 'border-primary/20 text-primary dark:text-blue-100 dark:border-blue-800/50 hover:bg-primary/5'}`}
                  >
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold mr-2 text-xs" style={{ background: 'linear-gradient(135deg, hsl(var(--primary)), var(--gradient-to, #4f46e5))' }}>
                      {user.name?.substring(0, 1).toUpperCase()}
                    </div>
                    <span className="max-w-[100px] truncate">{user.name}</span>
                    <ChevronDown className="w-4 h-4 ml-2 opacity-50" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-64 p-2 rounded-2xl shadow-2xl border-primary/5">
                  {permission_id <= 5 && (
                    <>
                      <DropdownMenuLabel className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Administração</DropdownMenuLabel>
                      <DropdownMenuItem asChild className="rounded-lg h-10 px-3 cursor-pointer">
                        <Link to="/admin" className="flex items-center">
                          <div className="w-7 h-7 rounded-md bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center mr-3">
                            <Monitor className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                          </div>
                          <span className="font-medium">Painel Admin</span>
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator className="my-2" />
                    </>
                  )}
                  <DropdownMenuLabel className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Sua Conta</DropdownMenuLabel>
                  <div className="grid grid-cols-2 gap-1 px-1">
                    <DropdownMenuItem asChild className="rounded-lg h-10 px-3 flex flex-col items-start justify-center cursor-pointer">
                      <Link to="/aluno" className="flex items-center w-full">
                        <div className="w-7 h-7 rounded-md bg-slate-50 dark:bg-slate-800 flex items-center justify-center mr-3">
                          <Home className="h-4 w-4 text-slate-600" />
                        </div>
                        <span className="font-medium">Painel</span>
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild className="rounded-lg h-10 px-3 flex flex-col items-start justify-center cursor-pointer">
                      <Link to="/aluno/cursos" className="flex items-center w-full">
                        <div className="w-7 h-7 rounded-md bg-slate-50 dark:bg-slate-800 flex items-center justify-center mr-3">
                          <BookOpen className="h-4 w-4 text-slate-600" />
                        </div>
                        <span className="font-medium">Cursos</span>
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild className="rounded-lg h-10 px-3 flex flex-col items-start justify-center cursor-pointer">
                      <Link to="/aluno/faturas" className="flex items-center w-full">
                        <div className="w-7 h-7 rounded-md bg-slate-50 dark:bg-slate-800 flex items-center justify-center mr-3">
                          <Receipt className="h-4 w-4 text-slate-600" />
                        </div>
                        <span className="font-medium">Faturas</span>
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild className="rounded-lg h-10 px-3 flex flex-col items-start justify-center cursor-pointer">
                      <Link to="/aluno/pedidos" className="flex items-center w-full">
                        <div className="w-7 h-7 rounded-md bg-slate-50 dark:bg-slate-800 flex items-center justify-center mr-3">
                          <ShoppingCart className="h-4 w-4 text-slate-600" />
                        </div>
                        <span className="font-medium">Pedidos</span>
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild className="rounded-lg h-10 px-3 flex flex-col items-start justify-center cursor-pointer">
                      <Link to="/aluno/notas" className="flex items-center w-full">
                        <div className="w-7 h-7 rounded-md bg-slate-50 dark:bg-slate-800 flex items-center justify-center mr-3">
                          <GraduationCap className="h-4 w-4 text-slate-600" />
                        </div>
                        <span className="font-medium">Notas</span>
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild className="rounded-lg h-10 px-3 flex flex-col items-start justify-center cursor-pointer">
                      <Link to="/aluno/perfil" className="flex items-center w-full">
                        <div className="w-7 h-7 rounded-md bg-slate-50 dark:bg-slate-800 flex items-center justify-center mr-3">
                          <UserCircle className="h-4 w-4 text-slate-600" />
                        </div>
                        <span className="font-medium">Perfil</span>
                      </Link>
                    </DropdownMenuItem>
                  </div>
                  <DropdownMenuSeparator className="my-2" />
                  <DropdownMenuItem onClick={handleLogout} disabled={isLoggingOut} className="rounded-lg h-10 px-3 text-red-600 focus:text-red-700 focus:bg-red-50 dark:focus:bg-red-950/30 cursor-pointer">
                    <LogOut className="mr-2 h-4 w-4" />
                    <span className="font-semibold">{isLoggingOut ? "Saindo..." : "Sair da conta"}</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <div className="flex items-center gap-2">
                <Button variant="ghost" asChild className={`rounded-lg ${isTransparentActive ? 'text-white hover:bg-white/10 hover:text-white' : 'text-primary dark:text-blue-100 hover:bg-primary/5'}`}>
                  <Link to="/login">Entrar</Link>
                </Button>
                <Button asChild className="bg-primary hover:bg-primary/90 text-white shadow-md shadow-primary/20 rounded-lg px-6 transition-all duration-300 hover:scale-[1.02]">
                  <Link to="/register">Cadastrar</Link>
                </Button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Mobile Drawer navigation */}
      <Drawer open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>Menu</DrawerTitle>
          </DrawerHeader>
          <div className="p-4 space-y-6 overflow-y-auto max-h-[80vh]">
            <div className="space-y-1">
              <p className="px-4 text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2">Navegação Principal</p>
              {(topMenuItems ?? [
                { label: 'Início', url: '/', auth: false },
                { label: 'Cursos', url: '/cursos', auth: false },
              ]).map((item: any) => {
                if (item.auth && !isAuthenticated) return null;
                const isExternal = item.external || item.url?.startsWith('http');
                return (
                  <Button key={item.label + item.url} asChild variant="ghost" className={`w-full justify-start h-12 rounded-xl px-4 hover:bg-primary/5 transition-all ${(() => { const p = location.pathname; const u = item.url; if (u === '/' && p === '/') return 'bg-primary/10'; if (u !== '/' && p.startsWith(u)) return 'bg-primary/10'; return ''; })()}`} onClick={() => setMobileNavOpen(false)}>
                    {isExternal ? (
                      <a href={item.url} target="_blank" rel="noreferrer" className="flex items-center">
                        <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center mr-3">
                          <BookOpen className="w-4 h-4 text-slate-600" />
                        </div>
                        <span className="font-semibold text-slate-700 dark:text-slate-200">{item.label}</span>
                      </a>
                    ) : (
                      <Link to={item.url} className="flex items-center">
                        <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center mr-3">
                          <BookOpen className="w-4 h-4 text-slate-600" />
                        </div>
                        <span className="font-semibold text-slate-700 dark:text-slate-200">{item.label}</span>
                      </Link>
                    )}
                  </Button>
                );
              })}
            </div>
            
            <div className="space-y-1">
              <p className="px-4 text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2">Preferências</p>
              <Button variant="outline" className="w-full justify-start h-12 rounded-xl px-4 border-slate-200 dark:border-white/5 hover:bg-primary/5 transition-all" onClick={toggleDarkMode}>
                <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center mr-3">
                  {isDark ? <Sun className="w-4 h-4 text-orange-500" /> : <Moon className="w-4 h-4 text-blue-600" />}
                </div>
                <span className="font-semibold text-slate-700 dark:text-slate-200">{isDark ? 'Mudar para Modo Claro' : 'Mudar para Modo Escuro'}</span>
              </Button>
            </div>

            {isAuthenticated && user ? (
              <div className="space-y-1">
                <p className="px-4 text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2">Área do Aluno</p>
                <div className="grid grid-cols-1 gap-1">
                  <Button asChild variant="ghost" className="w-full justify-start h-12 rounded-xl px-4 hover:bg-primary/5 transition-all" onClick={() => setMobileNavOpen(false)}>
                    <Link to="/aluno" className="flex items-center italic">
                      <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center mr-3">
                        <Monitor className="w-4 h-4 text-blue-600" />
                      </div>
                      <span className="font-semibold">Meu Painel</span>
                    </Link>
                  </Button>
                  {/* Additional student links could go here if needed in drawer too */}
                </div>
                {permission_id <= 5 && (
                  <Button asChild variant="ghost" className="w-full justify-start h-12 rounded-xl px-4 hover:bg-primary/5 mt-1" onClick={() => setMobileNavOpen(false)}>
                    <Link to="/admin" className="flex items-center">
                       <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center mr-3">
                        <Monitor className="w-4 h-4 text-indigo-600" />
                      </div>
                      <span className="font-semibold text-indigo-700 dark:text-indigo-400">Painel ADM</span>
                    </Link>
                  </Button>
                )}
                <div className="pt-4">
                  <Button variant="destructive" className="w-full h-12 rounded-xl font-bold shadow-lg shadow-red-500/10" onClick={handleLogout} disabled={isLoggingOut}>
                    <LogOut className="w-4 h-4 mr-2" />
                    {isLoggingOut ? 'Saindo...' : 'Sair da Conta'}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-3 pt-4 px-2">
                <Button asChild variant="outline" className="w-full h-12 rounded-xl font-bold border-primary/20 text-primary" onClick={() => setMobileNavOpen(false)}>
                  <Link to="/login">Acessar Conta</Link>
                </Button>
                <Button asChild className="w-full h-12 rounded-xl font-bold bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/20" onClick={() => setMobileNavOpen(false)}>
                  <Link to="/register">Criar Cadastro Grátis</Link>
                </Button>
              </div>
            )}
          </div>
        </DrawerContent>
      </Drawer>

      {/* Mobile Bottom Navigation Bar - Pattern for "App Moderno" */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/80 dark:bg-slate-950/80 backdrop-blur-xl border-t border-white/20 dark:border-slate-800/50 shadow-[0_-4px_30px_-10px_rgba(0,0,0,0.1)] transition-all duration-300">
        <div className="flex items-center justify-around h-16 px-2">
          <Link to="/" className="flex flex-col items-center justify-center w-full h-full gap-1 text-slate-500 dark:text-slate-400 hover:text-primary dark:hover:text-blue-400 transition-colors">
            <Home className="w-5 h-5" />
            <span className="text-[10px] font-bold uppercase tracking-tighter">Início</span>
          </Link>
          <Link to="/cursos" className="flex flex-col items-center justify-center w-full h-full gap-1 text-slate-500 dark:text-slate-400 hover:text-primary dark:hover:text-blue-400 transition-colors">
            <BookOpen className="w-5 h-5" />
            <span className="text-[10px] font-bold uppercase tracking-tighter">Cursos</span>
          </Link>
          
          {/* Central Action / Branding */}
          <div className="relative -mt-8">
            <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full" />
            <button 
              onClick={() => setMobileNavOpen(true)}
              className="relative w-14 h-14 rounded-full flex items-center justify-center text-white shadow-lg shadow-primary/30 border-4 border-white dark:border-slate-950 transition-transform active:scale-90" style={{ background: 'linear-gradient(135deg, hsl(var(--primary)), var(--gradient-to, #4f46e5))' }}
            >
              <Menu className="w-6 h-6" />
            </button>
          </div>

          <a href="https://incluireeducar.com.br/" target="_blank" rel="noreferrer" className="flex flex-col items-center justify-center w-full h-full gap-1 text-slate-500 dark:text-slate-400 hover:text-primary dark:hover:text-blue-400 transition-colors">
            <ExternalLink className="w-5 h-5" />
            <span className="text-[10px] font-bold uppercase tracking-tighter">Educar</span>
          </a>
          
          {isAuthenticated ? (
            <Link to="/aluno" className="flex flex-col items-center justify-center w-full h-full gap-1 text-slate-500 dark:text-slate-400 hover:text-primary dark:hover:text-blue-400 transition-colors">
              <UserCircle className="w-5 h-5" />
              <span className="text-[10px] font-bold uppercase tracking-tighter">Painel</span>
            </Link>
          ) : (
            <Link to="/login" className="flex flex-col items-center justify-center w-full h-full gap-1 text-slate-500 dark:text-slate-400 hover:text-primary dark:hover:text-blue-400 transition-colors">
              <LogOut className="w-5 h-5 rotate-180" />
              <span className="text-[10px] font-bold uppercase tracking-tighter">Entrar</span>
            </Link>
          )}
        </div>
      </nav>

      {/* Page content */}
      <main className="min-h-[60vh] pb-20 md:pb-0">{children}</main>

      {/* Footer */}
      {(() => {
        const finalBgColor = footerConfig?.backgroundColor || "#020617";
        const finalGradientTo = footerConfig?.gradientColorTo || "";
        const finalTextColor = footerConfig?.textColor || "#94a3b8";
        const finalTitleColor = footerConfig?.titleColor || "#ffffff";
        const bgStyle = finalGradientTo 
          ? `linear-gradient(to right, ${finalBgColor}, ${finalGradientTo})`
          : finalBgColor;
        const canEdit = !!user && Number(permission_id ?? 9999) < 3;

        return (
          <footer 
            className="border-t border-slate-900 py-16 px-4 relative overflow-hidden transition-all duration-500"
            style={{ background: bgStyle, color: finalTextColor }}
          >
            <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent opacity-30" />
            
            {canEdit && (
              <FooterEditor 
                currentConfig={footerConfig} 
                onConfigChange={(newConfig) => setFooterConfig(newConfig)} 
              />
            )}

            <div className="container mx-auto relative z-10">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-12">
                <div className="col-span-1 md:col-span-2 space-y-6">
                  <div className="flex items-center space-x-3 group w-fit">
                    <img
                      src={footerLogoUrl || "https://assets.zyrosite.com/cdn-cgi/image/format=auto,w=375,fit=crop,q=95/AQExkVPy2aUDzpqL/sem-nome-250-x-125-px-4-AzGMXn77KQTvDXrP.png"}
                      alt="Marca"
                      className={`h-10 opacity-80 group-hover:opacity-100 transition-opacity ${!footerLogoUrl ? 'brightness-0 invert' : ''}`}
                    />
                    <div className="border-l border-white/10 pl-3">
                      <h3 className="font-bold text-lg tracking-tight" style={{ color: finalTitleColor }}>{institutionName}</h3>
                      {institutionSlogan && <p className="text-xs uppercase tracking-widest font-bold" style={{ color: finalTextColor }}>{institutionSlogan}</p>}
                    </div>
                  </div>
                  <p className="text-sm leading-relaxed max-w-sm" style={{ color: finalTextColor }}>
                    {institutionDescription || 'Educação e tecnologia juntos.'}
                  </p>
                  <div className="flex space-x-4">
                    {/* Social media placeholders if needed, otherwise just leave or remove */}
                  </div>
                </div>
                <div>
                  <h4 className="font-bold text-sm uppercase tracking-widest mb-6" style={{ color: finalTitleColor }}>Acesso rápido</h4>
                  <ul className="space-y-3 text-sm" style={{ color: finalTextColor }}>
                    <li><Link to="/cursos" className="hover:text-primary transition-colors flex items-center group"><span className="w-1.5 h-1.5 rounded-full bg-primary/40 mr-2 opacity-0 group-hover:opacity-100 transition-all -ml-3.5 group-hover:ml-0" />Cursos</Link></li>
                    <li><Link to="/login" className="hover:text-primary transition-colors flex items-center group"><span className="w-1.5 h-1.5 rounded-full bg-primary/40 mr-2 opacity-0 group-hover:opacity-100 transition-all -ml-3.5 group-hover:ml-0" />Entrar</Link></li>
                    <li><Link to="/register" className="hover:text-primary transition-colors flex items-center group"><span className="w-1.5 h-1.5 rounded-full bg-primary/40 mr-2 opacity-0 group-hover:opacity-100 transition-all -ml-3.5 group-hover:ml-0" />Cadastro</Link></li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-bold text-sm uppercase tracking-widest mb-6" style={{ color: finalTitleColor }}>Institucional</h4>
                  <ul className="space-y-3 text-sm" style={{ color: finalTextColor }}>
                    <li>
                      <a href={institutionUrl || "https://incluireeducar.com.br/"} target="_blank" rel="noreferrer" className="hover:text-primary transition-colors flex items-center group">
                        <span className="w-1.5 h-1.5 rounded-full bg-primary/40 mr-2 opacity-0 group-hover:opacity-100 transition-all -ml-3.5 group-hover:ml-0" />
                        Site oficial
                      </a>
                    </li>
                  </ul>
                </div>
              </div>
              <div className="border-t border-white/5 mt-16 pt-8 flex flex-col md:flex-row justify-between items-center gap-4 text-xs" style={{ color: finalTextColor }}>
                <p>&copy; {new Date().getFullYear()} {institutionName}. Todos os direitos reservados.</p>
                <div className="flex gap-6">
                  <Link to="/pagina/politica-de-privacidade" className="hover:text-slate-300 transition-colors">Privacidade</Link>
                  <Link to="/pagina/termos" className="hover:text-slate-300 transition-colors">Termos</Link>
                </div>
              </div>
            </div>
          </footer>
        );
      })()}
    </div>
  );
}

export default InclusiveSiteLayout;
