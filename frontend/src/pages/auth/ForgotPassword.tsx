import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useState, useEffect } from 'react';
import { ArrowLeft } from 'lucide-react';

import InclusiveSiteLayout from '@/components/layout/InclusiveSiteLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { authService } from '@/services/authService';
import { toast } from '@/hooks/use-toast';
import { getRecaptchaToken, loadRecaptchaScript, fetchRecaptchaConfig, type RecaptchaConfig } from '@/lib/recaptcha';
import BrandLogo from '@/components/branding/BrandLogo';
import { getInstitutionName, getInstitutionNameAsync, getInstitutionSlogan, hydrateBrandingFromPublicApi } from '@/lib/branding';

const forgotPasswordSchema = z.object({
  email: z.string().email('Email inválido'),
});

type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;

export default function ForgotPassword() {
  const [isLoading, setIsLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [institutionName, setInstitutionName] = useState<string>(() => getInstitutionName());
  const [institutionSlogan, setInstitutionSlogan] = useState<string>(() => getInstitutionSlogan());
  
  // State for reCAPTCHA config
  const [recaptchaConfig, setRecaptchaConfig] = useState<RecaptchaConfig>({ enabled: false, site_key: null });

  /**
   * useEffect: Fetch reCAPTCHA config and load script
   */
  useEffect(() => {
    let mounted = true;
    fetchRecaptchaConfig().then((config) => {
      if (mounted) {
        setRecaptchaConfig(config);
        if (config.enabled && config.site_key) {
          loadRecaptchaScript(config.site_key).catch(() => {});
        }
      }
    });
    return () => { mounted = false; };
  }, []);

  /**
   * hydrateBranding
   */
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { name } = await hydrateBrandingFromPublicApi({ persist: true });
        const finalName = name || (await getInstitutionNameAsync());
        const finalSlogan = getInstitutionSlogan();
        if (!cancelled) {
          setInstitutionName(finalName);
          setInstitutionSlogan(finalSlogan);
        }
      } catch {
        if (!cancelled) {
          setInstitutionName(getInstitutionName());
          setInstitutionSlogan(getInstitutionSlogan());
        }
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const form = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: '',
    },
  });

  const onSubmit = async (data: ForgotPasswordFormData) => {
    try {
      setIsLoading(true);
      
      const { enabled, site_key } = recaptchaConfig;
      const captcha_action = 'forgot_password';
      let captcha_token = '';

      if (enabled && site_key) {
        try {
          captcha_token = await getRecaptchaToken(site_key, captcha_action);
          // Quick retry if token came empty on first attempt
          if (!captcha_token) {
            await new Promise((r) => setTimeout(r, 300));
            captcha_token = await getRecaptchaToken(site_key, captcha_action);
          }
        } catch (e) {
          console.warn('Recaptcha generation failed, proceeding without token:', e);
        }
      }

      await authService.forgotPassword({ 
        email: data.email,
        captcha_action,
        captcha_token,
      });
      setEmailSent(true);
      toast({
        title: "Email enviado!",
        description: "Verifique sua caixa de entrada para redefinir sua senha.",
      });
    } catch (error) {
      toast({
        title: "Erro",
        description: error instanceof Error ? error.message : "Erro desconhecido",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (emailSent) {
    return (
      <InclusiveSiteLayout>
        <section className="relative py-12 flex-1 flex items-center justify-center min-h-[600px]">
          {/* Background elements */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute -top-40 -left-40 w-80 h-80 bg-blue-500/20 rounded-full blur-3xl"></div>
            <div className="absolute -bottom-40 -right-40 w-80 h-80 bg-blue-400/20 rounded-full blur-3xl"></div>
          </div>

          <div className="relative z-10 w-full max-w-md bg-white rounded-2xl shadow-2xl p-8 border border-slate-100 text-center">
            <div className="mb-6 flex justify-center">
               <BrandLogo 
                  alt={institutionName || 'Logo'} 
                  className="h-20 w-auto object-contain" 
               />
            </div>
            
            <h2 className="text-2xl font-bold text-slate-800 mb-2">Email Enviado</h2>
            <p className="text-muted-foreground mb-8">
              Enviamos um link para redefinir sua senha para o email fornecido. Verifique sua caixa de entrada.
            </p>

            <div className="space-y-3">
              <Button asChild className="w-full bg-primary hover:bg-blue-700 rounded-md">
                <Link to="/login">Voltar ao Login</Link>
              </Button>
              <Button 
                variant="ghost" 
                className="w-full text-primary hover:bg-blue-50"
                onClick={() => setEmailSent(false)}
              >
                Tentar Novamente
              </Button>
            </div>
          </div>
        </section>
      </InclusiveSiteLayout>
    );
  }

  return (
    <InclusiveSiteLayout>
      <section className="relative py-12">
        {/* Background elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -left-40 w-80 h-80 bg-blue-500/20 rounded-full blur-3xl"></div>
          <div className="absolute -bottom-40 -right-40 w-80 h-80 bg-blue-400/20 rounded-full blur-3xl"></div>
          <div className="absolute top-1/2 left-1/4 w-60 h-60 bg-blue-300/10 rounded-full blur-2xl"></div>
          <div className="absolute bottom-1/4 right-1/3 w-40 h-40 bg-blue-200/10 rounded-full blur-xl"></div>
        </div>

        <div className="relative z-10 flex w-full max-w-6xl mx-auto px-4">
          {/* Left Side - Branding */}
          <div className="hidden lg:flex lg:w-1/2 items-center justify-center relative">
            <div className="text-center p-8 bg-white/10 backdrop-blur-md rounded-3xl border border-white/20 shadow-xl">
              <div className="mb-6 flex justify-center">
                 <div className="bg-white/90 p-6 rounded-2xl shadow-inner">
                    <BrandLogo 
                      alt={institutionName || 'Logo'} 
                      className="h-32 w-auto object-contain" 
                    />
                 </div>
              </div>
              <h2 className="text-3xl font-bold text-white mb-2 drop-shadow-md">
                {institutionName}
              </h2>
              {institutionSlogan && (
                <p className="text-blue-100 text-lg max-w-sm mx-auto font-light leading-relaxed">
                  {institutionSlogan}
                </p>
              )}
            </div>
          </div>

          {/* Right Side - Form */}
          <div className="w-full lg:w-1/2 flex items-center justify-center">
            <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-8 border border-slate-100">
              {/* Header with back button */}
              <div className="flex items-center mb-8">
                <Button
                  variant="ghost"
                  size="sm"
                  asChild
                  className="text-slate-500 hover:text-primary hover:bg-primary/5 p-2 mr-2"
                >
                  <Link to="/login">
                    <ArrowLeft className="h-5 w-5" />
                  </Link>
                </Button>
                
                {/* Mobile Heading */}
                <div className="flex-1 text-center lg:hidden">
                  <BrandLogo alt={institutionName || 'Logo'} className="h-12 mx-auto mb-2" />
                  <h1 className="text-lg font-bold text-primary">{institutionName}</h1>
                </div>
                
                {/* Desktop Headline */}
                <div className="flex-1 text-right hidden lg:block">
                  <h1 className="text-2xl font-bold text-slate-800">Recuperar Senha</h1>
                  <p className="text-xs text-muted-foreground">Digite seu email abaixo</p>
                </div>
              </div>

              <p className="text-muted-foreground text-sm mb-6 text-center lg:text-left">
                Informe o email associado à sua conta para receber o link de redefinição.
              </p>

              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-primary font-medium">Email</FormLabel>
                        <FormControl>
                          <Input
                            type="email"
                            placeholder="seu@email.com"
                            className="border-primary/20 focus:border-primary focus:ring-primary h-12"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button 
                    type="submit" 
                    className="w-full bg-primary hover:bg-blue-700 text-white font-medium rounded-md h-12 text-base" 
                    disabled={isLoading}
                  >
                     {isLoading ? 'Enviando...' : 'Enviar Link de Recuperação'}
                  </Button>
                </form>
              </Form>

              <div className="text-center text-sm mt-6 pt-6 border-t border-slate-100">
                <Link to="/login" className="text-primary hover:text-blue-700 font-medium flex items-center justify-center gap-2">
                  <ArrowLeft className="h-4 w-4" />
                  Voltar ao Login
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </InclusiveSiteLayout>
  );
}