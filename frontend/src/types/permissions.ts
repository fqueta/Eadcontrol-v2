export interface PermissionRecord {
  id: string;
  name: string;
  description?: string;
  created_at: string;
  updated_at: string;
}

export interface CreatePermissionInput {
  name: string;
  description?: string;
}

export interface UpdatePermissionInput {
  name?: string;
  description?: string;
}

export interface PermissionsListParams {
  search?: string;
  page?: number;
  per_page?: number;
}

export interface AccessFlags {
  can_view: boolean;
  can_create: boolean;
  can_edit: boolean;
  can_delete: boolean;
  can_upload: boolean;
}

export interface MenuPermissionRow {
  id?: string;
  permission_id: string;
  menu_id: number | string;
  parent_id?: number | string | null;
  can_view: boolean;
  can_create: boolean;
  can_edit: boolean;
  can_delete: boolean;
  can_upload: boolean;
}

export interface MenuPermissionUpsert {
  permission_id: string;
  permissions: MenuPermissionRow[];
}

export interface PermissionTreeNode {
  key: string;
  id: number | string;
  parent_id?: number | string | null;
  title: string;
  level: number;
  children?: PermissionTreeNode[];
  hasChildren: boolean;
  parent?: string;
}

export type AccessFlagKey = 'can_view' | 'can_create' | 'can_edit' | 'can_delete' | 'can_upload';

export interface Paginated<T> {
  data: T[];
  current_page?: number;
  last_page?: number;
  per_page?: number;
  total?: number;
  // Support for non-paginated responses
  items?: T[];
  meta?: {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
  };
}