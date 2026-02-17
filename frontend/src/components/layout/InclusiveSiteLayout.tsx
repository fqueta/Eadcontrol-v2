import { ReactNode, useEffect, useState } from "react";
import { Link } from "react-router-dom";
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
import { User, LogOut, ChevronDown, Monitor, ExternalLink, Moon, Sun, Menu, Home, BookOpen, Receipt, ShoppingCart, GraduationCap, UserCircle } from "lucide-react";
import { BrandLogo } from "@/components/branding/BrandLogo";
import { useEffect as useEffectReact } from "react";
import { applyBrandingFavicon, hydrateBrandingFromPublicApi } from "@/lib/branding";
import { ForceChangePasswordModal } from "@/components/auth/ForceChangePasswordModal";

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
  useEffectReact(() => {
    let cancelled = false;
    (async () => {
      try {
        await hydrateBrandingFromPublicApi({ persist: true });
        if (!cancelled) applyBrandingFavicon('/favicon.ico');
      } catch {
        if (!cancelled) applyBrandingFavicon('/favicon.ico');
      }
    })();
    return () => { cancelled = true; };
  }, []);
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
    <div className="min-h-screen bg-[#f8fafc] dark:bg-[#020617] transition-colors duration-500">
      {/* Refined background elements for modern app feel */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute -top-[10%] -right-[10%] w-[40%] h-[40%] bg-blue-400/10 dark:bg-blue-600/5 blur-[120px] rounded-full" />
        <div className="absolute top-[20%] -left-[10%] w-[35%] h-[35%] bg-indigo-400/10 dark:bg-indigo-600/5 blur-[100px] rounded-full" />
      </div>

      <ForceChangePasswordModal />

      {/* Header */}
      <header className="bg-white/80 dark:bg-slate-950/80 backdrop-blur-xl border-b border-white/20 dark:border-slate-800/50 relative md:sticky md:top-0 z-50 shadow-[0_2px_20px_-2px_rgba(0,0,0,0.03)] dark:shadow-[0_4px_30px_-5px_rgba(0,0,0,0.3)] transition-all duration-300">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center space-x-3 group cursor-pointer transition-transform duration-300 hover:scale-[1.02]">
            <BrandLogo
              alt="Marca"
              fallbackSrc="https://assets.zyrosite.com/cdn-cgi/image/format=auto,w=375,fit=crop,q=95/AQExkVPy2aUDzpqL/sem-nome-250-x-125-px-4-AzGMXn77KQTvDXrP.png"
              className="h-10 rounded-xl ring-1 ring-primary/10 dark:ring-primary/20 p-1.5 bg-white dark:bg-slate-900 shadow-sm"
            />
            <div className="hidden md:block">
              <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-indigo-600 dark:from-blue-400 dark:to-indigo-400">Incluir & Educar</h1>
              <p className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground/70 dark:text-blue-200/50">Tecnologia que Inclui</p>
            </div>
          </div>
          {/* Mobile actions: theme toggle + menu */}
          <div className="flex md:hidden items-center gap-2">
            <Button variant="outline" size="icon" className="border-primary/20 text-primary hover:bg-blue-50 dark:text-blue-100 dark:border-blue-800" onClick={toggleDarkMode} aria-label="Alternar tema">
              {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </Button>
            <Button variant="outline" size="icon" className="border-primary/20 text-primary hover:bg-blue-50 dark:text-blue-100 dark:border-blue-800" onClick={() => setMobileNavOpen(true)} aria-label="Abrir menu">
              <Menu className="w-4 h-4" />
            </Button>
          </div>
          <div className="hidden md:flex space-x-3 items-center">
            <Button asChild variant="ghost" className="text-primary dark:text-blue-100 hover:bg-primary/5 hover:text-primary transition-all duration-300 rounded-lg">
              <Link to="/">Início</Link>
            </Button>
            <Button asChild variant="ghost" className="text-primary dark:text-blue-100 hover:bg-primary/5 hover:text-primary transition-all duration-300 rounded-lg">
              <Link to="/cursos">Cursos</Link>
            </Button>
            <Button asChild variant="ghost" className="text-primary dark:text-blue-100 hover:bg-primary/5 hover:text-primary transition-all duration-300 rounded-lg">
              <a href="https://incluireeducar.com.br/" target="_blank" rel="noreferrer">
                <ExternalLink className="w-4 h-4 mr-2" />
                Site institucional
              </a>
            </Button>
            {/* Theme toggle (desktop only) */}
            <Button variant="outline" className="border-primary/20 text-primary dark:text-blue-100 dark:border-blue-800/50 hover:bg-primary/5 transition-all duration-300 rounded-lg shadow-sm" onClick={toggleDarkMode}>
              {isDark ? <Sun className="w-4 h-4 mr-2" /> : <Moon className="w-4 h-4 mr-2" />}
              {isDark ? 'Modo claro' : 'Modo escuro'}
            </Button>
            {isAuthenticated && user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="border-primary/20 text-primary dark:text-blue-100 dark:border-blue-800/50 hover:bg-primary/5 rounded-xl shadow-sm pl-2">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-indigo-600 flex items-center justify-center text-white font-bold mr-2 text-xs">
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
                <Button variant="ghost" asChild className="text-primary dark:text-blue-100 hover:bg-primary/5 rounded-lg">
                  <Link to="/login">Entrar</Link>
                </Button>
                <Button asChild className="bg-primary hover:bg-primary/90 text-white shadow-md shadow-primary/20 rounded-lg px-6 transition-all duration-300 hover:scale-[1.02]">
                  <Link to="/public-client-form">Cadastrar</Link>
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
              <Button asChild variant="ghost" className="w-full justify-start h-12 rounded-xl px-4 hover:bg-primary/5 transition-all" onClick={() => setMobileNavOpen(false)}>
                <Link to="/" className="flex items-center">
                  <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center mr-3">
                    <Home className="w-4 h-4 text-slate-600" />
                  </div>
                  <span className="font-semibold text-slate-700 dark:text-slate-200">Início</span>
                </Link>
              </Button>
              <Button asChild variant="ghost" className="w-full justify-start h-12 rounded-xl px-4 hover:bg-primary/5 transition-all" onClick={() => setMobileNavOpen(false)}>
                <Link to="/cursos" className="flex items-center">
                  <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center mr-3">
                    <BookOpen className="w-4 h-4 text-slate-600" />
                  </div>
                  <span className="font-semibold text-slate-700 dark:text-slate-200">Nossos Cursos</span>
                </Link>
              </Button>
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
                  <Link to="/public-client-form">Criar Cadastro Grátis</Link>
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
              className="relative w-14 h-14 rounded-full bg-gradient-to-br from-primary to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-primary/30 border-4 border-white dark:border-slate-950 transition-transform active:scale-90"
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
      <footer className="bg-slate-950 border-t border-slate-900 text-white py-16 px-4 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent opacity-30" />
        <div className="container mx-auto relative z-10">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-12">
            <div className="col-span-1 md:col-span-2 space-y-6">
              <div className="flex items-center space-x-3 group w-fit">
                <BrandLogo
                  alt="Marca"
                  fallbackSrc="https://assets.zyrosite.com/cdn-cgi/image/format=auto,w=375,fit=crop,q=95/AQExkVPy2aUDzpqL/sem-nome-250-x-125-px-4-AzGMXn77KQTvDXrP.png"
                  className="h-10 brightness-0 invert opacity-80 group-hover:opacity-100 transition-opacity"
                />
                <div className="border-l border-white/10 pl-3">
                  <h3 className="font-bold text-lg tracking-tight">Incluir & Educar</h3>
                  <p className="text-xs text-slate-500 uppercase tracking-widest font-medium">Tecnologia com propósito</p>
                </div>
              </div>
              <p className="text-slate-400 text-sm leading-relaxed max-w-sm">
                A maior distribuidora de soluções educacionais inclusivas do Brasil. Transformando a educação através da tecnologia e inovação.
              </p>
              <div className="flex space-x-4">
                {/* Social media placeholders if needed, otherwise just leave or remove */}
              </div>
            </div>
            <div>
              <h4 className="font-bold text-sm uppercase tracking-widest mb-6 text-slate-200">Acesso rápido</h4>
              <ul className="space-y-3 text-sm text-slate-400">
                <li><Link to="/cursos" className="hover:text-primary transition-colors flex items-center group"><span className="w-1.5 h-1.5 rounded-full bg-primary/40 mr-2 opacity-0 group-hover:opacity-100 transition-all -ml-3.5 group-hover:ml-0" />Cursos</Link></li>
                <li><Link to="/login" className="hover:text-primary transition-colors flex items-center group"><span className="w-1.5 h-1.5 rounded-full bg-primary/40 mr-2 opacity-0 group-hover:opacity-100 transition-all -ml-3.5 group-hover:ml-0" />Entrar</Link></li>
                <li><Link to="/public-client-form" className="hover:text-primary transition-colors flex items-center group"><span className="w-1.5 h-1.5 rounded-full bg-primary/40 mr-2 opacity-0 group-hover:opacity-100 transition-all -ml-3.5 group-hover:ml-0" />Cadastro</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold text-sm uppercase tracking-widest mb-6 text-slate-200">Institucional</h4>
              <ul className="space-y-3 text-sm text-slate-400">
                <li>
                  <a href="https://incluireeducar.com.br/" target="_blank" rel="noreferrer" className="hover:text-primary transition-colors flex items-center group">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary/40 mr-2 opacity-0 group-hover:opacity-100 transition-all -ml-3.5 group-hover:ml-0" />
                    Site oficial
                  </a>
                </li>
              </ul>
            </div>
          </div>
          <div className="border-t border-white/5 mt-16 pt-8 flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-slate-500">
            <p>&copy; {new Date().getFullYear()} Incluir & Educar. Todos os direitos reservados.</p>
            <div className="flex gap-6">
              <span className="hover:text-slate-300 cursor-pointer transition-colors">Privacidade</span>
              <span className="hover:text-slate-300 cursor-pointer transition-colors">Termos</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default InclusiveSiteLayout;