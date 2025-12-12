import { PlaceholderPattern } from '@/components/ui/placeholder-pattern';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, usePage } from '@inertiajs/react';
import Teste from '@/components/teste';
import { type NavItem } from '@/types';
import { BookOpen, Folder, LayoutGrid } from 'lucide-react';
import TextField from '@/components/estudo/TextField';

interface NavItemProps {
  label: string;
  href: string;
}

interface PageProps {
  user: User;
//   avatar: string[];
  notifications: string[];
  title: string;
  nav: NavItemProps;
}

// export default function Dashboard() {
//   const { user, notifications } = usePage<PageProps>().props;

//   return (
//     <div>
//       <h1>Bem-vindo, {user.name}</h1>
//       <h2>Notificações:</h2>
//       <ul>
//         {notifications.map((msg, index) => (
//           <li key={index}>{msg}</li>
//         ))}
//       </ul>
//     </div>
//   );
// }
export default function Dashboard() {
    const { user, notifications,title,nav } = usePage<PageProps>().props;

    const breadcrumbs: BreadcrumbItem[] = [
        {
            title: title,
            href: '/dashboard',
            // nav:nav,
        },
    ];
    console.log(nav);
     const mainNavItems: NavItem[] = [
    {
        title: 'Dashboard-23',
        href: '/dashboard',
        icon: LayoutGrid,
    },
    {
        title: 'Produtos',
        href: '/produtos',
        icon: LayoutGrid,
    },
];
    return (
        <AppLayout breadcrumbs={breadcrumbs} nav={mainNavItems}>
            <Head title="Dashboard" />
            <div className="flex h-full flex-1 flex-col gap-4 rounded-xl p-4 overflow-x-auto">
                <div className="grid auto-rows-min gap-4 md:grid-cols-3">
                    <h3>{user.name}</h3>
                    <div className="relative aspect-video overflow-hidden rounded-xl border border-sidebar-border/70 dark:border-sidebar-border">
                        <Teste />
                        <TextField/>
                        {/* <PlaceholderPattern className="absolute inset-0 size-full stroke-neutral-900/20 dark:stroke-neutral-100/20" /> */}
                    </div>
                    <div className="relative aspect-video overflow-hidden rounded-xl border border-sidebar-border/70 dark:border-sidebar-border">
                        <PlaceholderPattern className="absolute inset-0 size-full stroke-neutral-900/20 dark:stroke-neutral-100/20" />
                    </div>
                    <div className="relative aspect-video overflow-hidden rounded-xl border border-sidebar-border/70 dark:border-sidebar-border">
                        <PlaceholderPattern className="absolute inset-0 size-full stroke-neutral-900/20 dark:stroke-neutral-100/20" />
                    </div>
                </div>
                <div className="relative min-h-[100vh] flex-1 overflow-hidden rounded-xl border border-sidebar-border/70 md:min-h-min dark:border-sidebar-border">
                    <PlaceholderPattern className="absolute inset-0 size-full stroke-neutral-900/20 dark:stroke-neutral-100/20" />
                </div>
            </div>
        </AppLayout>
    );
}
