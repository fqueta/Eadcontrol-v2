import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useLocation } from "react-router-dom";
import { Cookie } from "lucide-react";

export const CookieConsent = () => {
    const [isVisible, setIsVisible] = useState(false);
    const location = useLocation();

    useEffect(() => {
        // Only checking on mount and when location changes
        const consent = localStorage.getItem("ead_lgpd_cookie_consent_v1");
        if (!consent) {
            setIsVisible(true);
        }
    }, [location.pathname]);

    // O usuário quer o aviso "na area publica".
    // Consideramos área não-publica: rotas internas como admin (/admin) e aluno (/aluno).
    const isPublicArea = !location.pathname.startsWith("/admin") && !location.pathname.startsWith("/aluno");
    
    if (!isPublicArea || !isVisible) return null;

    const acceptCookies = () => {
        localStorage.setItem("ead_lgpd_cookie_consent_v1", "true");
        setIsVisible(false);
    };

    return (
        <div className="fixed bottom-0 left-0 right-0 z-[9999] p-4 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 shadow-[0_-10px_40px_rgba(0,0,0,0.1)] animate-in slide-in-from-bottom duration-500">
            <div className="container mx-auto max-w-7xl flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-start sm:items-center gap-4">
                    <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-full shrink-0">
                        <Cookie className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div className="text-sm text-slate-600 dark:text-slate-300">
                        <p className="font-semibold text-slate-900 dark:text-white mb-1">
                            Aviso de Cookies e Privacidade
                        </p>
                        <p>
                            Utilizamos cookies para analisar o tráfego e personalizar sua experiência em nosso site.
                            Ao continuar navegando, você concorda com o uso de cookies em conformidade com a LGPD.
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-3 shrink-0 w-full sm:w-auto mt-2 sm:mt-0">
                    <Button 
                        variant="outline" 
                        className="w-full sm:w-auto"
                        onClick={() => window.open("/pagina/politica-de-privacidade", "_blank")}
                    >
                        Saiba mais
                    </Button>
                    <Button 
                        onClick={acceptCookies} 
                        className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white"
                    >
                        Aceitar e fechar
                    </Button>
                </div>
            </div>
        </div>
    );
};
