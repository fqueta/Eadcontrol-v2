import { ChevronUp, ChevronDown, User, Wrench } from "lucide-react";
import * as React from "react";
import { NavLink, useLocation, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  useSidebar,
  SidebarHeader,
  SidebarFooter,
  SidebarSeparator,
  SidebarRail,
} from "@/components/ui/sidebar";
import { TooltipProvider, Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { buildMenuFromDTO, filterMenuByViewAccess, defaultMenu } from "@/lib/menu";
import { BrandLogo } from "@/components/branding/BrandLogo";

/**
 * AppSidebar
 * pt-BR: Menu lateral moderno com branding, tooltips no modo colapsado e ação de recolher.
 * en-US: Modern sidebar with branding, collapsed tooltips, and collapse action.
 */
export function AppSidebar() {
  const { state } = useSidebar();
  const { menu: apiMenu, logout } = useAuth();
  const location = useLocation();
  const currentPath = location.pathname;
  const collapsed = state === "collapsed";

  /**
   * BrandLogo usage
   * pt-BR: Substitui lógica local de resolução por componente BrandLogo com fallback.
   * en-US: Replaces local resolution logic with BrandLogo component using fallback.
   */

  /**
   * resolveUrl
   * pt-BR: Normaliza URLs do menu evitando duplicar "/admin" e garantindo barra inicial.
   * en-US: Normalizes menu URLs, avoiding duplicate "/admin" and ensuring leading slash.
   */
  const rota_admin = 'admin';
  const resolveUrl = (url?: string): string => {
    if (!url || url === '#') return '#';
    const base = `/${rota_admin}`;
    if (url.startsWith(base)) return url; // already absolute under /admin
    if (url.startsWith('/')) return `${base}${url}`; // relative from root
    return `${base}/${url}`; // bare path
  };

  /**
   * submenu collapse state
   * pt-BR: Persistência de recolhimento de submenus por título do item.
   * en-US: Persist submenu collapsed state by item title key.
   */
  const GROUPS_KEY = 'sidebarGroupsCollapsed';
  const [collapsedGroups, setCollapsedGroups] = React.useState<Record<string, boolean>>(() => {
    try {
      const raw = localStorage.getItem(GROUPS_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  });

  /**
   * getGroupKey
   * pt-BR: Gera uma chave estável baseada no título do item.
   * en-US: Generate a stable key from the item title.
   */
  const getGroupKey = (title: string) => title.toLowerCase().replace(/[^a-z0-9]+/g, '-');

  /**
   * isGroupCollapsed
   * pt-BR: Verifica se o grupo está recolhido (persistido).
   * en-US: Check if group is collapsed (persisted).
   */
  const isGroupCollapsed = (title: string) => !!collapsedGroups[getGroupKey(title)];

  /**
   * toggleGroup
   * pt-BR: Alterna recolhimento e persiste no localStorage.
   * en-US: Toggle collapse and persist to localStorage.
   */
  const toggleGroup = (title: string) => {
    setCollapsedGroups((prev) => {
      const key = getGroupKey(title);
      const next = { ...prev, [key]: !prev[key] };
      localStorage.setItem(GROUPS_KEY, JSON.stringify(next));
      return next;
    });
  };

  // Build menu from API data or use default menu
  const baseMenu = apiMenu && apiMenu.length > 0 
    ? buildMenuFromDTO(apiMenu) 
    : buildMenuFromDTO(defaultMenu);

  // Filter by can_view access
  const menuItems = filterMenuByViewAccess(baseMenu);

  const isActive = (path: string) => currentPath === resolveUrl(path);
  const hasActiveChild = (items: any[]) => 
    items?.some((item) => isActive(item.url));

  /**
   * areAllGroupsCollapsed / collapseAllGroups / expandAllGroups
   * pt-BR: Utilitários para recolher/expandir todos os submenus de uma vez e persistir.
   * en-US: Utilities to collapse/expand all submenus at once and persist.
   */
  const groupKeys = menuItems.filter((i: any) => i.items)?.map((i: any) => getGroupKey(i.title)) ?? [];
  const areAllGroupsCollapsed = groupKeys.length > 0 && groupKeys.every((k) => !!collapsedGroups[k]);
  const collapseAllGroups = () => {
    setCollapsedGroups((prev) => {
      const next = { ...prev } as Record<string, boolean>;
      for (const k of groupKeys) next[k] = true;
      localStorage.setItem(GROUPS_KEY, JSON.stringify(next));
      return next;
    });
  };
  const expandAllGroups = () => {
    setCollapsedGroups((prev) => {
      const next = { ...prev } as Record<string, boolean>;
      for (const k of groupKeys) next[k] = false;
      localStorage.setItem(GROUPS_KEY, JSON.stringify(next));
      return next;
    });
  };
  return (
    <Sidebar className={collapsed ? "w-14" : "w-64"} collapsible="icon">
      {/* Rail para indicar área do menu quando colapsado */}
      <SidebarRail />

      {/* Header com branding */}
      <SidebarHeader className="border-b border-border print:hidden">
        <Link to="/admin/aero-dashboard" className="flex items-center gap-2 px-4 py-3">
          <BrandLogo alt="Logo" fallbackSrc="/aeroclube-logo.svg" className="h-6 w-auto" />
          {!collapsed && (
            <div className="flex flex-col">
              <span className="text-sm font-semibold">Ead Control</span>
              <span className="text-xs text-muted-foreground">Painel & Operações</span>
            </div>
          )}
        </Link>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          {/*
           * SidebarGroupLabel color override
           * pt-BR: Força cor do rótulo para o foreground do sidebar, evitando aparência clara.
           * en-US: Force label color to sidebar foreground to avoid washed-out text.
           */}
          <SidebarGroupLabel className="text-sidebar-foreground">Navegação Principal</SidebarGroupLabel>
          <SidebarGroupContent>
            <TooltipProvider>
              <SidebarMenu>
                {menuItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    {item.items ? (
                      // Menu with submenu
                      <Tooltip disableHoverableContent={!collapsed}>
                        <TooltipTrigger asChild>
                          {/*
                           * Submenu root button color
                           * Usa text-sidebar-foreground para garantir contraste em temas claros/escuros.
                           */}
                          {/*
                           * Evita button-aninhado: SidebarMenuButton asChild -> renderiza div.
                           * pt-BR: Usamos asChild para que o elemento raiz seja uma div, permitindo um botão de ação dentro sem violar a semântica.
                           * en-US: Use asChild so root becomes a div, allowing an inner action button without invalid nesting.
                           */}
                          <SidebarMenuButton
                            asChild
                            isActive={hasActiveChild(item.items)}
                            className="text-sidebar-foreground"
                            aria-expanded={!isGroupCollapsed(item.title)}
                          >
                            <div className="flex items-center gap-2 w-full">
                              <item.icon className="h-4 w-4 text-sidebar-foreground" />
                              {!collapsed && <span className="flex-1 truncate">{item.title}</span>}
                              {/* Botão de ação para recolher/expandir submenu */}
                              {!collapsed && (
                                <SidebarMenuAction
                                  onClick={() => toggleGroup(item.title)}
                                  aria-label={isGroupCollapsed(item.title) ? 'Expandir' : 'Recolher'}
                                  title={isGroupCollapsed(item.title) ? 'Expandir' : 'Recolher'}
                                >
                                  {isGroupCollapsed(item.title) ? (
                                    <ChevronDown className="h-4 w-4" />
                                  ) : (
                                    <ChevronUp className="h-4 w-4" />
                                  )}
                                </SidebarMenuAction>
                              )}
                            </div>
                          </SidebarMenuButton>
                        </TooltipTrigger>
                        {collapsed && (
                          <TooltipContent side="right">{item.title}</TooltipContent>
                        )}
                      </Tooltip>
                    ) : (
                      // Simple menu item
                      <Tooltip disableHoverableContent={!collapsed}>
                        <TooltipTrigger asChild>
                          {/*
                           * Simple item active styling
                           * pt-BR: Usa data-[active=true] para aplicar bg-primary + texto branco quando ativo.
                           * en-US: Use data-[active=true] to apply bg-primary + white text on active.
                           */}
                          <SidebarMenuButton 
                            asChild 
                            isActive={isActive(item.url)}
                            className="data-[active=true]:bg-primary data-[active=true]:text-primary-foreground"
                          >
                            <NavLink 
                              to={resolveUrl(item.url)} 
                              className="text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                            >
                              <item.icon className="h-4 w-4 text-sidebar-foreground" />
                              {!collapsed && <span>{item.title}</span>}
                            </NavLink>
                          </SidebarMenuButton>
                        </TooltipTrigger>
                        {collapsed && (
                          <TooltipContent side="right">{item.title}</TooltipContent>
                        )}
                      </Tooltip>
                    )}
                    {item.items && !collapsed && !isGroupCollapsed(item.title) && (
                      <SidebarMenuSub>
                        {item.items.map((subItem) => (
                          <SidebarMenuSubItem key={subItem.title}>
                          <SidebarMenuSubButton 
                            asChild 
                            isActive={isActive(subItem.url)}
                            className="data-[active=true]:bg-primary data-[active=true]:text-primary-foreground"
                          >
                            <NavLink 
                              to={resolveUrl(subItem.url)} 
                              className="text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                            >
                              <span>{subItem.title}</span>
                            </NavLink>
                          </SidebarMenuSubButton>
                          </SidebarMenuSubItem>
                        ))}
                      </SidebarMenuSub>
                    )}
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </TooltipProvider>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarSeparator />

      <SidebarFooter className="border-t border-border">
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton>
                  <User className="h-4 w-4" />
                  {!collapsed && <span>Usuário</span>}
                  <ChevronUp className="ml-auto h-4 w-4" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent 
                side="top" 
                className="w-[--radix-popper-anchor-width]"
              >
                <DropdownMenuItem asChild>
                  <Link to="/admin/settings/user-profiles" className="flex items-center">
                    <User className="mr-2 h-4 w-4" />
                    <span>Perfil</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/admin/settings/system" className="flex items-center">
                    <Wrench className="mr-2 h-4 w-4" />
                    <span>Configurações</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={logout} className="text-red-600 cursor-pointer">
                  <ChevronUp className="mr-2 h-4 w-4" />
                  <span>Sair</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
          {/**
           * Removido: Botão "Recolher menu" do rodapé
           * pt-BR: O controle de colapsar a sidebar deixou de ter efeito nesta UI.
           * en-US: The sidebar collapse control is no longer effective in this UI.
           */}
          {/* Controle global de submenus: recolher/expandir todos com persistência */}
          <SidebarMenuItem>
            <Button
              variant="ghost"
              size="sm"
              className="mx-2 mb-2 w-[calc(100%-1rem)]"
              onClick={() => (areAllGroupsCollapsed ? expandAllGroups() : collapseAllGroups())}
              aria-label={areAllGroupsCollapsed ? 'Expandir submenus' : 'Recolher submenus'}
            >
              {areAllGroupsCollapsed ? (
                <ChevronDown className="mr-2 h-4 w-4" />
              ) : (
                <ChevronUp className="mr-2 h-4 w-4" />
              )}
              {!collapsed && (
                <span>{areAllGroupsCollapsed ? 'Expandir submenus' : 'Recolher submenus'}</span>
              )}
            </Button>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}