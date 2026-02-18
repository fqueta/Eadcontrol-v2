import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Eye, EyeOff, ArrowLeft } from 'lucide-react';
import InclusiveSiteLayout from '@/components/layout/InclusiveSiteLayout';
import BrandLogo from '@/components/branding/BrandLogo';
import { getInstitutionName, getInstitutionNameAsync, getInstitutionSlogan, hydrateBrandingFromPublicApi } from '@/lib/branding';

import { useAuth } from '@/contexts/AuthContext';
import { useRedirect } from '@/hooks/useRedirect';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { getSiteKey, getRecaptchaToken, loadRecaptchaScript } from '@/lib/recaptcha';

const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'Senha deve ter pelo menos 6 caracteres'),
  remember: z.boolean().default(false),
});

type LoginFormData = z.infer<typeof loginSchema>;

/**
 * Login
 * pt-BR: Tela de login com tema do Aeroclube de Juiz de Fora (ACJF).
 *        Atualiza paleta para tons de azul e identidade institucional.
 * en-US: Login screen themed to Aeroclube de Juiz de Fora.
 *        Uses blue palette and institutional identity.
 */
export default function Login() {
  const [showPassword, setShowPassword] = useState(false);
  const [loginSuccess, setLoginSuccess] = useState(false);
  const { login, isLoading, user, isAuthenticated } = useAuth();
  const { redirectAfterAuth } = useRedirect();
  // Nome da instituição (dinâmico via API/options)
  const [institutionName, setInstitutionName] = useState<string>(() => getInstitutionName());
  // Slogan da instituição (dinâmico via API/options)
  const [institutionSlogan, setInstitutionSlogan] = useState<string>(() => getInstitutionSlogan());

  // Efeito para redirecionar após login bem-sucedido
  useEffect(() => {
    if (loginSuccess && isAuthenticated && user) {
      redirectAfterAuth(user);
      setLoginSuccess(false);
    }
  }, [loginSuccess, redirectAfterAuth]);

  const form = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
      remember: false,
    },
  });
  // console.log('redirectAfterAuth', redirectAfterAuth);
  /**
   * useEffect: Preload reCAPTCHA script on mount
   * pt-BR: Carrega o script do reCAPTCHA v3 assim que a página é montada.
   * en-US: Loads the reCAPTCHA v3 script as soon as the page mounts.
   */
  useEffect(() => {
    const siteKey = getSiteKey();
    if (siteKey) {
      loadRecaptchaScript(siteKey).catch(() => {/* ignore errors */});
    }
  }, []);

  /**
   * hydrateBrandingFromPublicApi
   * pt-BR: Carrega nome e slogan do endpoint público e atualiza estado.
   * en-US: Loads name and slogan from the public endpoint and updates state.
   */
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { name, slogan } = await hydrateBrandingFromPublicApi({ persist: true });
        const finalName = name || (await getInstitutionNameAsync());
        const finalSlogan = slogan || getInstitutionSlogan();
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

  /**
   * onSubmit
   * pt-BR: Antes de enviar, obtém um token reCAPTCHA v3 para a ação "login".
   *        Faz uma segunda tentativa rápida se o primeiro token vier vazio.
   * en-US: Before submit, acquires a reCAPTCHA v3 token for "login" action.
   *        Performs a quick second attempt if the first token is empty.
   */
  const onSubmit = async (data: LoginFormData) => {
    const siteKey = getSiteKey();
    const captcha_action = 'login';
    let captcha_token = '';
    try {
      captcha_token = siteKey ? await getRecaptchaToken(siteKey, captcha_action) : '';
      // Quick retry if token came empty on first attempt
      if (siteKey && !captcha_token) {
        await new Promise((r) => setTimeout(r, 300));
        captcha_token = await getRecaptchaToken(siteKey, captcha_action);
      }
    } catch (e) {
      console.warn('Recaptcha generation failed (likely invalid site key config), proceeding without token:', e);
      // Proceed with empty token so user is not blocked frontend-side
    }

    const success = await login({
      email: data.email,
      password: data.password,
      remember: data.remember,
      captcha_action,
      captcha_token,
    });
    if (success) {
      setLoginSuccess(true);
    }
  };

  return (
    <InclusiveSiteLayout>
      {/**
       * Login Section
       * pt-BR: Conteúdo de login sob o layout inclusivo, com decoração própria.
       * en-US: Login content under inclusive layout, keeping decorative background.
       */}
      <section className="relative py-12">
        {/* Elementos decorativos de fundo */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -left-40 w-80 h-80 bg-blue-500/20 rounded-full blur-3xl"></div>
          <div className="absolute -bottom-40 -right-40 w-80 h-80 bg-blue-400/20 rounded-full blur-3xl"></div>
          <div className="absolute top-1/2 left-1/4 w-60 h-60 bg-blue-300/10 rounded-full blur-2xl"></div>
          <div className="absolute bottom-1/4 right-1/3 w-40 h-40 bg-blue-200/10 rounded-full blur-xl"></div>
        </div>

        <div className="relative z-10 flex w-full max-w-6xl mx-auto px-4">
          {/* Lado esquerdo - Logo e Branding */}
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

          {/* Lado direito - Formulário */}
          <div className="w-full lg:w-1/2 flex items-center justify-center">
            <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-8 border border-slate-100">
              {/* Header com botão voltar */}
              <div className="flex items-center mb-8">
                <Button
                  variant="ghost"
                  size="sm"
                  asChild
                  className="text-slate-500 hover:text-primary hover:bg-primary/5 p-2 mr-2"
                >
                  <Link to="/">
                    <ArrowLeft className="h-5 w-5" />
                  </Link>
                </Button>
                
                {/* Mobile Heading (visible on all, but essential for mobile) */}
                <div className="flex-1 text-center lg:hidden">
                  <BrandLogo alt={institutionName || 'Logo'} className="h-12 mx-auto mb-2" />
                  <h1 className="text-lg font-bold text-primary">{institutionName}</h1>
                </div>
                
                {/* Desktop Heading adjustment: Just concise Title */}
                 <div className="flex-1 text-right hidden lg:block">
                    <h1 className="text-2xl font-bold text-slate-800">Bem-vindo</h1>
                    <p className="text-xs text-muted-foreground">Faça login para acessar</p>
                 </div>
              </div>

              <p className="text-muted-foreground text-sm mb-6 text-center">
                Entre em sua conta para continuar
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
                            className="border-primary/20 focus:border-primary focus:ring-primary"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-primary font-medium">Senha</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Input
                              type={showPassword ? 'text' : 'password'}
                              placeholder="Sua senha"
                              className="border-primary/20 focus:border-primary focus:ring-primary pr-10"
                              {...field}
                            />
                            <button
                              type="button"
                              className="absolute inset-y-0 right-0 pr-3 flex items-center"
                              onClick={() => setShowPassword(!showPassword)}
                            >
                              {showPassword ? (
                                <EyeOff className="h-4 w-4 text-muted-foreground" />
                              ) : (
                                <Eye className="h-4 w-4 text-muted-foreground" />
                              )}
                            </button>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="flex items-center justify-between">
                    <FormField
                      control={form.control}
                      name="remember"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-2 space-y-0">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                              className="border-primary/50 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                            />
                          </FormControl>
                          <FormLabel className="text-sm text-muted-foreground">
                            Lembrar de mim
                          </FormLabel>
                        </FormItem>
                      )}
                    />
                    
                    <Link
                      to="/forgot-password"
                      className="text-sm text-primary hover:text-blue-700 underline font-medium"
                    >
                      Esqueceu a senha?
                    </Link>
                  </div>

                  <Button 
                    type="submit" 
                    className="w-full bg-primary hover:bg-blue-700 text-white font-medium rounded-md" 
                    disabled={isLoading}
                  >
                    {isLoading ? 'Entrando...' : 'Entrar'}
                  </Button>
                </form>
              </Form>

              <div className="text-center text-sm mt-4">
                <span className="text-muted-foreground">Não tem uma conta? </span>
                <Link to="/register" className="text-primary underline hover:text-blue-700 font-medium">
                  Cadastre-se
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </InclusiveSiteLayout>
  );
}