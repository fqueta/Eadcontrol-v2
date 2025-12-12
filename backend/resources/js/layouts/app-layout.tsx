import AppLayoutTemplate from '@/layouts/app/app-sidebar-layout';
import { type BreadcrumbItem } from '@/types';
import { type NavItem } from '@/types';
import { type ReactNode } from 'react';

interface AppLayoutProps {
    children: ReactNode;
    breadcrumbs?: BreadcrumbItem[];
    nav?: NavItem[]
}

export default ({ children, breadcrumbs,nav, ...props }: AppLayoutProps) => (
    <AppLayoutTemplate nav={nav} breadcrumbs={breadcrumbs} {...props}>
        {children}
    </AppLayoutTemplate>
);
