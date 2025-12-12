import {
  Home,
  Users,
  Wrench,
  Package,
  FileText,
  ClipboardList,
  DollarSign,
  BarChart3,
  Settings,
  LucideIcon,
} from "lucide-react";
import { MenuItemDTO, MenuItemResolved } from "@/types/menu";

// Icon map for resolving string icon names to components
export const iconMap: Record<string, LucideIcon> = {
  Home,
  Users,
  Wrench,
  Package,
  FileText,
  ClipboardList,
  DollarSign,
  BarChart3,
  Settings,
};

// Helper to check if can_view is truthy (considers 1, '1', true as truthy)
export function isCanViewTruthy(canView?: boolean | number | '0' | '1'): boolean {
  if (canView === undefined || canView === null) return false;
  if (typeof canView === 'boolean') return canView;
  if (typeof canView === 'number') return canView === 1;
  if (typeof canView === 'string') return canView === '1';
  return false;
}

// Resolve menu DTOs to menu items with actual icon components
export function buildMenuFromDTO(menuDTO: MenuItemDTO[]): MenuItemResolved[] {
  return menuDTO.map((item) => ({
    ...item,
    id: item.id,
    parent_id: item.parent_id,
    icon: iconMap[item.icon || ""] || FileText, // fallback to FileText
    can_view: item.can_view,
    items: item.items ? buildMenuFromDTO(item.items) : undefined,
  }));
}

// Find menu item by URL path
export function findMenuItemByUrl(menu: MenuItemDTO[], url: string): MenuItemDTO | undefined {
  for (const item of menu) {
    if (item.url === url) {
      return item;
    }
    if (item.items) {
      const found = findMenuItemByUrl(item.items, url);
      if (found) return found;
    }
  }
  return undefined;
}

// Default menu structure when no menu is provided by API
export const defaultMenu: MenuItemDTO[] = [
  {
    title: "Dashboard",
    url: "/admin/aero-dashboard",
    icon: "Home",
    permission: "dashboard.view",
    can_view: true
  },
  {
    title: "Dashboard de Métricas",
    url: "/admin/metrics-dashboard",
    icon: "BarChart3",
    permission: "settings.metrics.view",
    can_view: true
  },
  {
    title: "Clientes",
    url: "/admin/clients",
    icon: "Users",
    permission: "clients.view",
    can_view: true
  },
  {
    title: "Vendas",
    url: "/admin/sales",
    icon: "BarChart3",
    permission: "sales.view",
    can_view: true
  },
  {
    title: "Parceiros",
    url: "/admin/partners",
    icon: "Users",
    permission: "partners.view",
    can_view: true
  },
  {
    title: "Objetos de Serviço",
    url: "/admin/service-objects",
    icon: "Wrench",
    permission: "service-objects.view",
    can_view: true
  },
  {
    title: "Catálogo",
    icon: "Package",
    permission: "catalog.view",
    can_view: true,
    items: [
      {
        title: "Produtos",
        url: "/admin/products",
        permission: "catalog.products.view",
        can_view: true
      },
      {
        title: "Serviços",
        url: "/admin/services",
        permission: "catalog.services.view",
        can_view: true
      },
      {
        title: "Categorias",
        url: "/admin/categories",
        permission: "catalog.categories.view",
        can_view: true
      }
    ]
  },
  {
    title: "Escola",
    icon: "FileText",
    permission: "school.view",
    can_view: true,
    items: [
      {
        title: "Cursos",
        url: "/admin/school/courses",
        permission: "school.courses.view",
        can_view: true
      },
      {
        title: "Turmas",
        url: "/admin/school/classes",
        permission: "school.classes.view",
        can_view: true
      }
    ]
  },
  {
    title: "Orçamentos",
    url: "/admin/budgets",
    icon: "FileText",
    permission: "budgets.view",
    can_view: true
  },
  {
    title: "Ordens de Serviço",
    url: "/admin/service-orders",
    icon: "ClipboardList",
    permission: "service-orders.view",
    can_view: true
  },
  {
    title: "Financeiro",
    icon: "DollarSign",
    permission: "finance.view",
    can_view: true,
    items: [
      {
        title: "Categorias",
        url: "/admin/financial/categories",
        permission: "financial.categories.view",
        can_view: true
      },
      {
        title: "Pagamentos",
        url: "/admin/finance/payments",
        permission: "finance.payments.view",
        can_view: true
      },
      {
        title: "Fluxo de Caixa",
        url: "/admin/finance/cash-flow",
        permission: "finance.cash-flow.view",
        can_view: true
      },
      {
        title: "Contas a Receber",
        url: "/admin/finance/accounts-receivable",
        permission: "finance.accounts-receivable.view",
        can_view: true
      },
      {
        title: "Contas a Pagar",
        url: "/admin/finance/accounts-payable",
        permission: "finance.accounts-payable.view",
        can_view: true
      }
    ]
  },
  {
    title: "Relatórios",
    icon: "BarChart3",
    permission: "reports.view",
    can_view: true,
    items: [
      {
        title: "Receita",
        url: "/admin/reports/revenue",
        permission: "reports.revenue.view",
        can_view: true
      },
      {
        title: "Ordens de Serviço",
        url: "/admin/reports/service-orders",
        permission: "reports.service-orders.view",
        can_view: true
      },
      {
        title: "Top Produtos",
        url: "/admin/reports/top-products",
        permission: "reports.top-products.view",
        can_view: true
      },
      {
        title: "Financeiro",
        url: "/admin/reports/financial",
        permission: "reports.financial.view",
        can_view: true
      }
    ]
  },
  {
    title: "Configurações",
    icon: "Settings",
    permission: "settings.view",
    can_view: true,
    items: [
      {
        title: "Usuários",
        url: "/admin/settings/users",
        permission: "settings.users.view",
        can_view: true
      },
      {
        title: "Perfis de Usuário",
        url: "/admin/settings/user-profiles",
        permission: "settings.user-profiles.view",
        can_view: true
      },
      {
        title: "Permissões",
        url: "/admin/settings/permissions",
        permission: "settings.permissions.view",
        can_view: true
      },
      {
        title: "Status de OS",
        url: "/admin/settings/os-statuses",
        permission: "settings.os-statuses.view",
        can_view: true
      },
      {
        title: "Métodos de Pagamento",
        url: "/admin/settings/payment-methods",
        permission: "settings.payment-methods.view",
        can_view: true
      },
      {
        title: "Sistema",
        url: "/admin/settings/system",
        permission: "settings.system.view",
        can_view: true
      }
    ]
  }
];

// Filter menu based on can_view access (can_view undefined = invisible by default)
export function filterMenuByViewAccess(menu: MenuItemResolved[]): MenuItemResolved[] {
  return menu
    .map((item) => {
      // If item has subitems, filter them recursively first
      let filteredItems: MenuItemResolved[] | undefined;
      if (item.items) {
        filteredItems = filterMenuByViewAccess(item.items);
      }

      // Item is visible if:
      // 1. Its can_view is truthy OR
      // 2. It has visible children (even if its own can_view is falsy/undefined)
      const hasVisibleChildren = filteredItems && filteredItems.length > 0;
      const isItemVisible = isCanViewTruthy(item.can_view) || hasVisibleChildren;

      if (!isItemVisible) {
        return null;
      }

      return {
        ...item,
        items: filteredItems,
      };
    })
    .filter((item) => item !== null) as MenuItemResolved[];
}