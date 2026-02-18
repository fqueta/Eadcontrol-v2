import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { Bell, Search, LogOut, Sun, Moon, Loader2, LayoutDashboard, Users, Package, BarChart2, Laptop } from "lucide-react";
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
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import commentsService from "@/services/commentsService";
import { useToast } from "@/components/ui/use-toast";
import { BrandLogo } from "@/components/branding/BrandLogo";
import { ForceChangePasswordModal } from "@/components/auth/ForceChangePasswordModal";

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
  const qc = useQueryClient();
  const { toast } = useToast();

  // Branding
  // pt-BR: Usa helper compartilhado para obter a logo com fallback.
  // en-US: Uses shared helper to get brand logo with fallback.

  /**
   * BrandLogo usage
   * pt-BR: Usa componente BrandLogo para resolver e exibir a logo com fallback.
   * en-US: Uses BrandLogo component to resolve and display the logo with fallback.
   */

  /**
   * pendingCommentsQuery
   * pt-BR: Busca comentários com status "pending" para exibir um alerta no sino.
   *        Faz polling leve a cada 60s e atualiza ao focar a janela.
   * en-US: Fetches comments with "pending" status to show an alert on the bell.
   *        Performs light polling every 60s and updates on window focus.
   */
  const pendingCommentsQuery = useQuery({
    queryKey: ["admin-pending-comments"],
    queryFn: async () => {
      const res: any = await commentsService.adminList("pending", 1, 5);
      if (Array.isArray(res)) {
        return { items: res, total: res.length };
      }
      const items = Array.isArray(res?.data) ? res.data : [];
      const total = Number(res?.total ?? items.length);
      return { items, total };
    },
    refetchInterval: 60 * 1000,
    refetchOnWindowFocus: true,
  });

  /**
   * bellApproveMutation
   * pt-BR: Aprova comentário diretamente a partir do sininho e atualiza contagem.
   * en-US: Approves comment from the bell and refreshes pending count.
   */
  const bellApproveMutation = useMutation({
    mutationFn: async (id: number | string) => commentsService.adminApprove(id),
    onSuccess: () => {
      try { qc.invalidateQueries({ queryKey: ["admin-pending-comments"] }); } catch {}
      pendingCommentsQuery.refetch();
      toast({ title: "Comentário aprovado" });
    },
    onError: () => toast({ title: "Falha ao aprovar", variant: "destructive" } as any),
  });

  /**
   * bellRejectMutation
   * pt-BR: Rejeita comentário diretamente a partir do sininho e atualiza contagem.
   * en-US: Rejects comment from the bell and refreshes pending count.
   */
  const bellRejectMutation = useMutation({
    mutationFn: async (id: number | string) => commentsService.adminReject(id),
    onSuccess: () => {
      try { qc.invalidateQueries({ queryKey: ["admin-pending-comments"] }); } catch {}
      pendingCommentsQuery.refetch();
      toast({ title: "Comentário rejeitado" });
    },
    onError: () => toast({ title: "Falha ao rejeitar", variant: "destructive" } as any),
  });

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
        <ForceChangePasswordModal />
        
        <div className="flex-1 flex flex-col">
          {/* Header */}
          <header className="sticky top-0 z-40 h-14 border-b border-border bg-background/70 backdrop-blur supports-[backdrop-filter]:bg-background/60 flex items-center justify-between px-4 lg:px-6">
            <div className="flex items-center gap-4">
              <SidebarTrigger data-lov-name="SidebarTrigger" />
              <div className="hidden md:flex items-center gap-2">
                <BrandLogo alt="Logo" fallbackSrc="/aeroclube-logo.svg" className="h-6 w-auto" />
                <span className="hidden lg:block text-sm text-muted-foreground">Ead Control</span>
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
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="ghost" size="icon" title="Notificações de comentários">
                    <div className="relative">
                      <Bell className="h-4 w-4" />
                      {Number(pendingCommentsQuery.data?.total || 0) > 0 && (
                        <span className="absolute -top-1 -right-1 h-4 min-w-[16px] px-1 rounded-full bg-red-600 text-white text-[10px] leading-4 text-center">
                          {Math.min(99, Number(pendingCommentsQuery.data?.total || 0))}
                        </span>
                      )}
                    </div>
                  </Button>
                </PopoverTrigger>
                <PopoverContent align="end" className="w-80">
                  <div className="space-y-2">
                    <div className="text-sm font-medium">Moderação de comentários</div>
                    {pendingCommentsQuery.isLoading ? (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Carregando…
                      </div>
                    ) : Number(pendingCommentsQuery.data?.total || 0) === 0 ? (
                      <div className="text-sm text-muted-foreground">Sem comentários pendentes.</div>
                    ) : (
                      <div className="space-y-2">
                        {(pendingCommentsQuery.data?.items || []).map((c: any) => {
                          const targetType = String(c?.commentable_type || c?.target_type || "").toLowerCase();
                          const targetId = String(c?.commentable_id || c?.target_id || "");
                          const isActivity = targetType.includes("activity") || /activity/i.test(String(c?.commentable_type || ""));
                          const viewPath = isActivity && targetId ? `/admin/school/activities/${targetId}/view` : undefined;
                          const modPath = isActivity && targetId ? `/admin/school/activities/${targetId}/comments` : "/admin/school/comments";
                          return (
                            <div key={String(c?.id)} className="rounded-md border p-2 hover:bg-muted">
                              <div className="text-xs text-muted-foreground">
                                {String(c?.user_name || "Autor")}{c?.created_at ? ` • ${new Date(String(c.created_at)).toLocaleString()}` : ""}
                              </div>
                              <div className="text-sm line-clamp-2">{String(c?.body || "")}</div>
                              <div className="text-[11px] text-muted-foreground mt-1">
                                Alvo: {String(c?.commentable_type || "?")} #{String(c?.commentable_id || "?")}
                              </div>
                              <div className="mt-2 flex flex-wrap gap-2 justify-end">
                                {isActivity && viewPath && (
                                  <Button size="sm" variant="outline" onClick={() => navigate(viewPath)}>Ver atividade</Button>
                                )}
                                <Button size="sm" variant="outline" onClick={() => navigate(modPath)}>Ir para moderação</Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => bellApproveMutation.mutate(c?.id ?? "")}
                                  disabled={bellApproveMutation.isPending}
                                >Aprovar</Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => bellRejectMutation.mutate(c?.id ?? "")}
                                  disabled={bellRejectMutation.isPending}
                                >Rejeitar</Button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                    <div className="pt-1 flex justify-end">
                      <Button size="sm" variant="outline" onClick={() => navigate('/admin/school/comments')}>
                        Ir para moderação
                      </Button>
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
              
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
                <CommandItem onSelect={() => { setCmdOpen(false); navigate('/admin/school-dashboard'); }}>
                  <LayoutDashboard className="mr-2 h-4 w-4" />
                  Dashboard Ead Control
                </CommandItem>
                <CommandItem onSelect={() => { setCmdOpen(false); navigate('/admin/clients'); }}>
                  <Users className="mr-2 h-4 w-4" />
                  Clientes
                </CommandItem>

                <CommandItem onSelect={() => { setCmdOpen(false); navigate('/admin/products'); }}>
                  <Package className="mr-2 h-4 w-4" />
                  Produtos
                </CommandItem>
                <CommandItem onSelect={() => { setCmdOpen(false); navigate('/admin/metrics'); }}>
                  <BarChart2 className="mr-2 h-4 w-4" />
                  Métricas
                </CommandItem>
              </CommandGroup>
              <CommandSeparator />
              <CommandGroup heading="Ações">
                <CommandItem onSelect={() => { toggleTheme(); }}>
                  <Laptop className="mr-2 h-4 w-4" />
                  Alternar tema
                </CommandItem>
                <CommandItem onSelect={() => { setCmdOpen(false); handleLogout(); }}>
                  <LogOut className="mr-2 h-4 w-4" />
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