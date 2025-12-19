import AppLogoIcon from './app-logo-icon';
import { getBrandLogoUrl } from '@/lib/branding';

export default function AppLogo() {
    /**
     * AppLogo
     * pt-BR: Renderiza a logo de marca dinâmica (localStorage/window/env) com fallback.
     * en-US: Renders dynamic brand logo (localStorage/window/env) with fallback.
     */
    const brandLogoUrl = getBrandLogoUrl('/logo.png');
    return (
        <>
            <div className="flex aspect-square size-8 items-center justify-center rounded-md bg-sidebar-primary text-sidebar-primary-foreground overflow-hidden">
                {/* Prefer dynamic image; fallback to icon if it fails */}
                <img
                    src={brandLogoUrl}
                    alt="Logo"
                    className="h-5 w-5 object-contain"
                    onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                />
                <AppLogoIcon className="size-5 fill-current text-white dark:text-black" />
            </div>
            <div className="ml-1 grid flex-1 text-left text-sm">
                <span className="mb-0.5 truncate leading-tight font-semibold">Ead Control</span>
            </div>
        </>
    );
}
