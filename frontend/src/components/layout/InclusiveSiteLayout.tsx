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
    <div className="min-h-screen bg-gradient-to-br from-violet-50 via-white to-emerald-50">
      {/* Header */}
      <header className="bg-white/80 dark:bg-violet-950/60 backdrop-blur-md border-b border-violet-200 dark:border-violet-800 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <BrandLogo
              alt="Marca"
              fallbackSrc="https://assets.zyrosite.com/cdn-cgi/image/format=auto,w=375,fit=crop,q=95/AQExkVPy2aUDzpqL/sem-nome-250-x-125-px-4-AzGMXn77KQTvDXrP.png"
              className="h-10 rounded-md ring-1 ring-violet-200/40 dark:ring-violet-700/40 p-1 drop-shadow-sm"
            />
            <div className="hidden md:block">
              <h1 className="text-xl font-bold text-violet-800 dark:text-violet-100">Incluir & Educar</h1>
              <p className="text-xs text-violet-600 dark:text-violet-300">Tecnologia que Inclui. Educação que Transforma.</p>
            </div>
          </div>
          {/* Mobile actions: theme toggle + menu */}
          <div className="flex md:hidden items-center gap-2">
            <Button variant="outline" size="icon" className="border-violet-300 text-violet-700 hover:bg-violet-50 dark:text-violet-100 dark:border-violet-700" onClick={toggleDarkMode} aria-label="Alternar tema">
              {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </Button>
            <Button variant="outline" size="icon" className="border-violet-300 text-violet-700 hover:bg-violet-50 dark:text-violet-100 dark:border-violet-700" onClick={() => setMobileNavOpen(true)} aria-label="Abrir menu">
              <Menu className="w-4 h-4" />
            </Button>
          </div>
          <div className="hidden md:flex space-x-3 items-center">
            <Button asChild variant="ghost" className="text-violet-700 hover:bg-violet-50">
              <Link to="/cursos">Cursos</Link>
            </Button>
            <Button asChild variant="ghost" className="text-violet-700 hover:bg-violet-50">
              <a href="https://incluireeducar.com.br/" target="_blank" rel="noreferrer">
                <ExternalLink className="w-4 h-4 mr-2" />
                Site institucional
              </a>
            </Button>
            {/* Theme toggle (desktop only) */}
            <Button variant="outline" className="border-violet-300 text-violet-700 hover:bg-violet-50 dark:text-violet-100 dark:border-violet-700" onClick={toggleDarkMode}>
              {isDark ? <Sun className="w-4 h-4 mr-2" /> : <Moon className="w-4 h-4 mr-2" />}
              {isDark ? 'Modo claro' : 'Modo escuro'}
            </Button>
            {isAuthenticated && user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="border-violet-300 text-violet-700 hover:bg-violet-50">
                    <User className="w-4 h-4 mr-2" />
                    {user.name}
                    <ChevronDown className="w-4 h-4 ml-2" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  {permission_id <= 5 && (
                    <>
                      <DropdownMenuLabel>Painel Administrativo</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem asChild>
                        <Link to="/admin" className="flex items-center">
                          <Monitor className="mr-2 h-4 w-4" />
                          Acessar painel
                        </Link>
                      </DropdownMenuItem>
                    </>
                  )}
                  <DropdownMenuLabel>Área do aluno</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {/**
                   * Navegação rápida da área do aluno
                   * pt-BR: Links de navegação semelhantes ao menu da imagem 2.
                   * en-US: Quick navigation links similar to the referenced menu.
                   */}
                  <DropdownMenuItem asChild>
                    <Link to="/aluno" className="flex items-center">
                      <Home className="mr-2 h-4 w-4" />
                      Painel
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/aluno/cursos" className="flex items-center">
                      <BookOpen className="mr-2 h-4 w-4" />
                      Meus cursos
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/aluno/faturas" className="flex items-center">
                      <Receipt className="mr-2 h-4 w-4" />
                      Minhas faturas
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/aluno/pedidos" className="flex items-center">
                      <ShoppingCart className="mr-2 h-4 w-4" />
                      Meus pedidos
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/aluno/notas" className="flex items-center">
                      <GraduationCap className="mr-2 h-4 w-4" />
                      Minhas notas
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/aluno/perfil" className="flex items-center">
                      <UserCircle className="mr-2 h-4 w-4" />
                      Perfil
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout} disabled={isLoggingOut} className="text-red-600">
                    <LogOut className="mr-2 h-4 w-4" />
                    {isLoggingOut ? "Saindo..." : "Sair"}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <>
                <Button variant="outline" asChild className="border-violet-300 text-violet-700 hover:bg-violet-50">
                  <Link to="/login">Entrar</Link>
                </Button>
                <Button asChild className="bg-violet-700 hover:bg-violet-800">
                  <Link to="/public-client-form">Cadastrar</Link>
                </Button>
              </>
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
          <div className="p-3 space-y-2">
            <Button asChild variant="ghost" className="w-full justify-start">
              <Link to="/cursos" onClick={() => setMobileNavOpen(false)}>Cursos</Link>
            </Button>
            <Button asChild variant="ghost" className="w-full justify-start">
              <a href="https://incluireeducar.com.br/" target="_blank" rel="noreferrer">Site institucional</a>
            </Button>
            <div className="border-t my-2" />
            <Button variant="outline" className="w-full justify-start" onClick={toggleDarkMode}>
              {isDark ? <Sun className="w-4 h-4 mr-2" /> : <Moon className="w-4 h-4 mr-2" />} 
              {isDark ? 'Modo claro' : 'Modo escuro'}
            </Button>
            {isAuthenticated && user ? (
              <>
                {permission_id <= 5 && (
                  <Button asChild variant="ghost" className="w-full justify-start">
                    <Link to="/admin" onClick={() => setMobileNavOpen(false)}>Painel Administrativo</Link>
                  </Button>
                )}
                <Button variant="destructive" className="w-full justify-start" onClick={handleLogout} disabled={isLoggingOut}>
                  {isLoggingOut ? 'Saindo...' : 'Sair'}
                </Button>
              </>
            ) : (
              <>
                <Button asChild variant="outline" className="w-full justify-start" onClick={() => setMobileNavOpen(false)}>
                  <Link to="/login">Entrar</Link>
                </Button>
                <Button asChild className="w-full justify-start bg-violet-700 hover:bg-violet-800" onClick={() => setMobileNavOpen(false)}>
                  <Link to="/public-client-form">Cadastrar</Link>
                </Button>
              </>
            )}
          </div>
        </DrawerContent>
      </Drawer>

      {/* Page content */}
      <main className="min-h-[60vh]">{children}</main>

      {/* Footer */}
      <footer className="bg-violet-900 text-white py-12 px-4">
        <div className="container mx-auto">
          <div className="grid md:grid-cols-3 gap-8">
            <div>
              <div className="flex items-center space-x-3 mb-4">
                <BrandLogo
                  alt="Marca"
                  fallbackSrc="https://assets.zyrosite.com/cdn-cgi/image/format=auto,w=375,fit=crop,q=95/AQExkVPy2aUDzpqL/sem-nome-250-x-125-px-4-AzGMXn77KQTvDXrP.png"
                  className="h-8"
                />
                <div>
                  <h3 className="font-bold">Incluir & Educar</h3>
                  <p className="text-sm text-violet-200">Tecnologia com propósito</p>
                </div>
              </div>
              <p className="text-violet-200 text-sm">
                A maior distribuidora de soluções educacionais inclusivas do Brasil.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Acesso rápido</h4>
              <ul className="space-y-2 text-sm text-violet-200">
                <li><Link to="/cursos" className="hover:text-white">Cursos</Link></li>
                <li><Link to="/login" className="hover:text-white">Entrar</Link></li>
                <li><Link to="/public-client-form" className="hover:text-white">Cadastro</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Institucional</h4>
              <ul className="space-y-2 text-sm text-violet-200">
                <li>
                  <a href="https://incluireeducar.com.br/" target="_blank" rel="noreferrer" className="hover:text-white">
                    Site oficial
                  </a>
                </li>
              </ul>
            </div>
          </div>
          <div className="border-t border-violet-800 mt-8 pt-8 text-center text-sm text-violet-200">
            <p>&copy; {new Date().getFullYear()} Incluir & Educar. Todos os direitos reservados.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default InclusiveSiteLayout;