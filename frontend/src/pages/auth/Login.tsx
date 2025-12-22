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
    let captcha_token = siteKey ? await getRecaptchaToken(siteKey, captcha_action) : '';
    // Quick retry if token came empty on first attempt
    if (siteKey && !captcha_token) {
      await new Promise((r) => setTimeout(r, 300));
      captcha_token = await getRecaptchaToken(siteKey, captcha_action);
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
          {/* Lado esquerdo - Ícone e elementos decorativos */}
          <div className="hidden lg:flex lg:w-1/2 items-center justify-center relative">
            <div className="text-center">
              {/* Ícone principal */}
              <div className="w-64 h-64 bg-white/10 backdrop-blur-sm rounded-3xl flex items-center justify-center mb-8 mx-auto border border-white/20">
                <div className="w-32 h-32 bg-white rounded-2xl flex items-center justify-center">
                  <svg className="w-20 h-20 text-blue-600" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                  </svg>
                </div>
              </div>
            </div>
          </div>

          {/* Lado direito - Formulário */}
          <div className="w-full lg:w-1/2 flex items-center justify-center">
            <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-8">
              {/* Header com botão voltar */}
              <div className="flex items-center mb-6">
                <Button
                  variant="ghost"
                  size="sm"
                  asChild
                  className="text-blue-700 hover:bg-blue-50 p-2"
                >
                  <Link to="/">
                    <ArrowLeft className="h-4 w-4" />
                  </Link>
                </Button>
                <div className="flex-1 text-center">
                  {/* Brand logo (dinâmico via API/options) */}
                  <BrandLogo alt={institutionName || 'Logo'} className="h-10 mx-auto mb-2" />
                  <h1 className="text-xl font-bold text-blue-700">{institutionName}</h1>
                  <p className="text-xs text-blue-600">{institutionSlogan}</p>
                </div>
              </div>

              <p className="text-blue-600 text-sm mb-6 text-center">
                Entre em sua conta para continuar
              </p>

              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-blue-700 font-medium">Email</FormLabel>
                        <FormControl>
                          <Input
                            type="email"
                            placeholder="seu@email.com"
                            className="border-blue-200 focus:border-blue-500 focus:ring-blue-500"
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
                        <FormLabel className="text-blue-700 font-medium">Senha</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Input
                              type={showPassword ? 'text' : 'password'}
                              placeholder="Sua senha"
                              className="border-blue-200 focus:border-blue-500 focus:ring-blue-500 pr-10"
                              {...field}
                            />
                            <button
                              type="button"
                              className="absolute inset-y-0 right-0 pr-3 flex items-center"
                              onClick={() => setShowPassword(!showPassword)}
                            >
                              {showPassword ? (
                                <EyeOff className="h-4 w-4 text-blue-400" />
                              ) : (
                                <Eye className="h-4 w-4 text-blue-400" />
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
                              className="border-blue-300 data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
                            />
                          </FormControl>
                          <FormLabel className="text-sm text-blue-600">
                            Lembrar de mim
                          </FormLabel>
                        </FormItem>
                      )}
                    />
                    
                    <Link
                      to="/forgot-password"
                      className="text-sm text-blue-600 hover:text-blue-800 underline font-medium"
                    >
                      Esqueceu a senha?
                    </Link>
                  </div>

                  <Button 
                    type="submit" 
                    className="w-full bg-blue-700 hover:bg-blue-800 text-white font-medium" 
                    disabled={isLoading}
                  >
                    {isLoading ? 'Entrando...' : 'Entrar'}
                  </Button>
                </form>
              </Form>

              <div className="text-center text-sm mt-4">
                <span className="text-blue-100">Não tem uma conta? </span>
                <Link to="/public-client-form" className="text-blue-100 underline hover:text-white font-medium">
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