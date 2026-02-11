import { LucideIcon } from "lucide-react";

export interface MenuItemDTO {
  id: number | string;
  parent_id?: number | string | null;
  title: string;
  url?: string;
  icon?: string;
  permission?: string;
  can_view?: boolean | number | '0' | '1';
  items?: MenuItemDTO[];
}

export interface MenuItemResolved {
  id: number | string;
  parent_id?: number | string | null;
  title: string;
  url?: string;
  icon: LucideIcon;
  can_view?: boolean | number | '0' | '1';
  items?: MenuItemResolved[];
}