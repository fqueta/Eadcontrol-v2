import { MenuItemDTO } from '@/types/menu';
import { PermissionTreeNode } from '@/types/permissions';

/**
 * Converts menu items into a flat array of permission tree nodes
 * for use in the hierarchical permissions grid
 */
export function buildPermissionTree(menuItems: MenuItemDTO[]): PermissionTreeNode[] {
  const result: PermissionTreeNode[] = [];

  function processMenuItem(item: MenuItemDTO, level: number = 0, parentKey?: string): void {
    const key = String(item.id ?? `${item.title}-${level}`);
    
    const node: PermissionTreeNode = {
      key,
      id: item.id!,
      parent_id: item.parent_id ?? null,
      title: item.title,
      level,
      hasChildren: !!(item.items && item.items.length > 0),
      parent: parentKey,
    };

    result.push(node);

    // Process children if they exist
    if (item.items && item.items.length > 0) {
      item.items.forEach(child => {
        processMenuItem(child, level + 1, key);
      });
    }
  }

  menuItems.forEach(item => processMenuItem(item));
  return result;
}

/**
 * Groups permission tree nodes by parent for easier rendering
 */
export function groupPermissionsByParent(nodes: PermissionTreeNode[]): Record<string, PermissionTreeNode[]> {
  const groups: Record<string, PermissionTreeNode[]> = {};
  
  nodes.forEach(node => {
    const parent = node.parent || 'root';
    if (!groups[parent]) {
      groups[parent] = [];
    }
    groups[parent].push(node);
  });

  return groups;
}

/**
 * Creates initial access flags for all permissions
 */
export function createInitialAccessFlags(menuItems: MenuItemDTO[]): Record<string, {
  can_view: boolean;
  can_create: boolean;
  can_edit: boolean;
  can_delete: boolean;
  can_upload: boolean;
}> {
  const tree = buildPermissionTree(menuItems);
  const flags: Record<string, any> = {};

  tree.forEach(node => {
    flags[node.key] = {
      can_view: false,
      can_create: false,
      can_edit: false,
      can_delete: false,
      can_upload: false,
    };
  });

  return flags;
}