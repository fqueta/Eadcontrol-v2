import { ChevronUp, ChevronDown, User, Wrench, Settings, ChartPie, GraduationCap, Globe } from "lucide-react";
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
  DropdownMenuLabel,
  DropdownMenuSeparator,
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
        <Link to="/" title="Ir para o site" className="flex items-center gap-2 px-4 py-3">
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
          <SidebarGroupLabel className="text-muted-foreground/70 uppercase tracking-wider font-bold text-[10px] mb-2 px-4">Navegação Principal</SidebarGroupLabel>
          <SidebarGroupContent>
            <TooltipProvider>
              <SidebarMenu className="space-y-1 px-2">
                {menuItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    {item.items ? (
                      collapsed ? (
                        // Collapsed: Dropdown Menu
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <SidebarMenuButton
                              className="w-full justify-center text-sm font-medium text-muted-foreground hover:text-primary hover:bg-primary/5 transition-all duration-200 rounded-xl"
                            >
                              <item.icon className="h-[18px] w-[18px]" />
                              <span className="sr-only">{item.title}</span>
                            </SidebarMenuButton>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent side="right" align="start" className="w-48 ml-2">
                             <DropdownMenuLabel>{item.title}</DropdownMenuLabel>
                             <DropdownMenuSeparator />
                             {item.items.map((subItem) => (
                               <DropdownMenuItem key={subItem.title} asChild>
                                 <Link to={resolveUrl(subItem.url)} className="cursor-pointer">
                                   {subItem.title}
                                 </Link>
                               </DropdownMenuItem>
                             ))}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      ) : (
                        // Expanded: Collapsible
                        <>
                          <SidebarMenuButton
                            asChild
                            isActive={hasActiveChild(item.items)}
                            className="w-full justify-start text-sm font-medium text-muted-foreground hover:text-primary hover:bg-primary/5 transition-all duration-200 rounded-xl cursor-pointer"
                            aria-expanded={!isGroupCollapsed(item.title)}
                            onClick={() => toggleGroup(item.title)}
                          >
                            <div className="flex items-center gap-3 w-full px-2 py-2">
                              <item.icon className="h-[18px] w-[18px]" />
                              <span className="flex-1 truncate">{item.title}</span>
                              <SidebarMenuAction
                                className="hover:bg-transparent text-muted-foreground/50 hover:text-primary transition-colors bg-transparent active:bg-transparent focus:bg-transparent"
                              >
                                {isGroupCollapsed(item.title) ? (
                                  <ChevronDown className="h-4 w-4" />
                                ) : (
                                  <ChevronUp className="h-4 w-4" />
                                )}
                              </SidebarMenuAction>
                            </div>
                          </SidebarMenuButton>
                          {!isGroupCollapsed(item.title) && (
                            <SidebarMenuSub className="ml-4 border-l-2 border-primary/10 pl-2 space-y-1 my-1">
                              {item.items.map((subItem) => (
                                <SidebarMenuSubItem key={subItem.title}>
                                <SidebarMenuSubButton 
                                  asChild 
                                  isActive={isActive(subItem.url)}
                                  className="w-full justify-start text-sm transition-all duration-200 rounded-lg data-[active=true]:text-primary data-[active=true]:font-semibold data-[active=true]:bg-primary/5 hover:bg-primary/5 hover:text-primary text-muted-foreground"
                                >
                                  <NavLink 
                                    to={resolveUrl(subItem.url)} 
                                    className="flex items-center gap-2 px-2 py-1.5"
                                  >
                                    <span>{subItem.title}</span>
                                  </NavLink>
                                </SidebarMenuSubButton>
                                </SidebarMenuSubItem>
                              ))}
                            </SidebarMenuSub>
                          )}
                        </>
                      )
                    ) : (
                      // Simple menu item
                      <Tooltip disableHoverableContent={!collapsed}>
                        <TooltipTrigger asChild>
                          <SidebarMenuButton 
                            asChild 
                            isActive={isActive(item.url)}
                            className={`w-full text-sm font-medium transition-all duration-200 rounded-xl data-[active=true]:bg-primary/10 data-[active=true]:text-primary data-[active=true]:font-bold hover:bg-primary/5 hover:text-primary ${collapsed ? 'justify-center' : 'justify-start'}`}
                          >
                            <NavLink 
                              to={resolveUrl(item.url)} 
                              className={`flex items-center gap-3 py-2 ${collapsed ? 'px-0 justify-center' : 'px-2'}`}
                            >
                              <item.icon className={`h-[18px] w-[18px] ${isActive(item.url) ? "text-primary" : "text-muted-foreground group-hover:text-primary"}`} />
                              {!collapsed && <span>{item.title}</span>}
                            </NavLink>
                          </SidebarMenuButton>
                        </TooltipTrigger>
                        {collapsed && (
                          <TooltipContent side="right">{item.title}</TooltipContent>
                        )}
                      </Tooltip>
                    )}
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </TooltipProvider>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarSeparator className="mx-4 my-2 opacity-50" />

      <SidebarFooter className="p-2">
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <div className={`flex items-center gap-3 p-2 rounded-xl cursor-pointer hover:bg-accent transition-colors duration-200 ${collapsed ? 'justify-center' : ''}`}>
                  <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-primary to-indigo-600 flex items-center justify-center text-white font-bold shadow-sm ring-2 ring-white dark:ring-slate-950">
                    <User className="h-5 w-5" />
                  </div>
                  {!collapsed && (
                    <div className="flex flex-col flex-1 overflow-hidden">
                      <span className="text-sm font-semibold truncate text-foreground">Minha Conta</span>
                      <span className="text-[10px] text-muted-foreground truncate">Gerenciar perfil</span>
                    </div>
                  )}
                  {!collapsed && <ChevronUp className="h-4 w-4 text-muted-foreground ml-auto" />}
                </div>
              </DropdownMenuTrigger>
              <DropdownMenuContent 
                side="top" 
                className="w-56 p-2 rounded-2xl shadow-xl border-border/50 backdrop-blur-sm bg-popover/95"
              >
                <DropdownMenuItem asChild className="rounded-lg cursor-pointer focus:bg-primary/5 focus:text-primary">
                  <Link to="/admin/settings/user-profiles" className="flex items-center gap-2 py-2">
                    <User className="h-4 w-4" />
                    <span>Perfil</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild className="rounded-lg cursor-pointer focus:bg-primary/5 focus:text-primary">
                  <Link to="/admin/settings/system" className="flex items-center gap-2 py-2">
                    <Wrench className="h-4 w-4" />
                    <span>Configurações</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={logout} className="rounded-lg cursor-pointer text-red-600 focus:bg-red-50 dark:focus:bg-red-950/30 focus:text-red-700 mt-1">
                  <ChevronUp className="h-4 w-4 mr-2 rotate-90" />
                  <span>Sair</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
          
          <SidebarMenuItem>
            <Button
              variant="ghost"
              size="sm"
              className={`w-full mt-1 text-muted-foreground hover:text-foreground ${collapsed ? 'px-0 justify-center' : 'justify-start'}`}
              onClick={() => (areAllGroupsCollapsed ? expandAllGroups() : collapseAllGroups())}
              aria-label={areAllGroupsCollapsed ? 'Expandir submenus' : 'Recolher submenus'}
            >
              {areAllGroupsCollapsed ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronUp className="h-4 w-4" />
              )}
              {!collapsed && (
                <span className="ml-2 text-xs">{areAllGroupsCollapsed ? 'Expandir tudo' : 'Recolher tudo'}</span>
              )}
            </Button>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}