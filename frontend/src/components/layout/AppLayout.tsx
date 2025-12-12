import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { Bell, Search, LogOut, Sun, Moon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/contexts/AuthContext";
import { useUserPrefs } from "@/contexts/UserPrefsContext";
import { useTheme } from "@/contexts/ThemeContext";
import { useNavigate } from "react-router-dom";
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandSeparator,
} from "@/components/ui/command";
import React from "react";

interface AppLayoutProps {
  children: React.ReactNode;
}

/**
 * AppLayout
 * pt-BR: Shell global com sidebar, header moderno (sticky), toggle de tema e Command Palette.
 * en-US: Global shell with sidebar, modern sticky header, theme toggle, and Command Palette.
 */
export function AppLayout({ children }: AppLayoutProps) {
  const { user, logout } = useAuth();
  const { prefs, setPref } = useUserPrefs();
  const { applyThemeSettings } = useTheme();
  const navigate = useNavigate();
  const [cmdOpen, setCmdOpen] = React.useState(false);

  const handleLogout = async () => {
    await logout();
  };

  const getUserInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .substring(0, 2)
      .toUpperCase();
  };

  /**
   * Alterna modo claro/escuro persistindo em localStorage e aplicando via ThemeProvider
   */
  const toggleTheme = () => {
    try {
      const saved = localStorage.getItem("appearanceSettings");
      const current = saved ? JSON.parse(saved) : { darkMode: false };
      const next = { ...current, darkMode: !current.darkMode };
      localStorage.setItem("appearanceSettings", JSON.stringify(next));
      applyThemeSettings();
    } catch (e) {
      console.warn("Falha ao alternar tema:", e);
    }
  };

  return (
    <SidebarProvider 
      open={prefs.sidebarOpen} 
      onOpenChange={(open) => setPref('sidebarOpen', open)}
    >
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        
        <div className="flex-1 flex flex-col">
          {/* Header */}
          <header className="sticky top-0 z-40 h-14 border-b border-border bg-background/70 backdrop-blur supports-[backdrop-filter]:bg-background/60 flex items-center justify-between px-4 lg:px-6">
            <div className="flex items-center gap-4">
              <SidebarTrigger data-lov-name="SidebarTrigger" />
              <div className="hidden md:flex items-center gap-2">
                <img
                  src="/aeroclube-logo.svg"
                  onError={(e) => { (e.currentTarget as HTMLImageElement).src = "/placeholder.svg"; }}
                  alt="Logo"
                  className="h-6 w-auto"
                />
                <span className="hidden lg:block text-sm text-muted-foreground">CRM • Aeroclube</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" onClick={() => setCmdOpen(true)} title="Pesquisar (Ctrl+K)">
                <Search className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" onClick={toggleTheme} title="Alternar tema">
                {/* Mostra sol/lua conforme classe dark no documento */}
                <Sun className="h-4 w-4 dark:hidden" />
                <Moon className="h-4 w-4 hidden dark:block" />
              </Button>
              <Button variant="ghost" size="icon">
                <Bell className="h-4 w-4" />
              </Button>
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="flex items-center gap-2 text-sm h-auto p-2">
                    <div className="text-right hidden sm:block">
                      <div className="font-medium">{user?.name}</div>
                      <div className="text-muted-foreground">{user?.role || 'Usuário'}</div>
                    </div>
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={user?.avatar} alt={user?.name} />
                      <AvatarFallback>
                        {user?.name ? getUserInitials(user.name) : 'U'}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>Minha Conta</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout}>
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Sair</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </header>

          {/* Main Content */}
          <main className="flex-1 overflow-auto p-4 lg:p-6">
            {children}
          </main>

          {/* Command Palette Global */}
          <CommandDialog open={cmdOpen} onOpenChange={setCmdOpen}>
            <CommandInput placeholder="Buscar ou navegar..." />
            <CommandList>
              <CommandEmpty>Nenhum resultado.</CommandEmpty>
              <CommandGroup heading="Ir para">
                <CommandItem onSelect={() => { setCmdOpen(false); navigate('/admin/aero-dashboard'); }}>
                  Dashboard Aeroclube
                </CommandItem>
                <CommandItem onSelect={() => { setCmdOpen(false); navigate('/admin/clients'); }}>
                  Clientes
                </CommandItem>
                <CommandItem onSelect={() => { setCmdOpen(false); navigate('/admin/service-orders'); }}>
                  Ordens de Serviço
                </CommandItem>
                <CommandItem onSelect={() => { setCmdOpen(false); navigate('/admin/products'); }}>
                  Produtos
                </CommandItem>
                <CommandItem onSelect={() => { setCmdOpen(false); navigate('/admin/metrics'); }}>
                  Métricas
                </CommandItem>
              </CommandGroup>
              <CommandSeparator />
              <CommandGroup heading="Ações">
                <CommandItem onSelect={() => { toggleTheme(); }}>
                  Alternar tema
                </CommandItem>
                <CommandItem onSelect={() => { setCmdOpen(false); handleLogout(); }}>
                  Sair
                </CommandItem>
              </CommandGroup>
            </CommandList>
          </CommandDialog>
        </div>
      </div>
    </SidebarProvider>
  );
}