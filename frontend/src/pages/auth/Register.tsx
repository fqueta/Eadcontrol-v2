import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Eye, EyeOff, ArrowLeft } from 'lucide-react';

import { useAuth } from '@/contexts/AuthContext';
import { useRedirect } from '@/hooks/useRedirect';
import InclusiveSiteLayout from '@/components/layout/InclusiveSiteLayout';
import BrandLogo from '@/components/branding/BrandLogo';
import { getSiteKey, getRecaptchaToken, loadRecaptchaScript, fetchRecaptchaConfig, type RecaptchaConfig } from '@/lib/recaptcha';
import { getInstitutionName, getInstitutionNameAsync, getInstitutionSlogan, hydrateBrandingFromPublicApi } from '@/lib/branding';

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

const registerSchema = z.object({
  name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'Senha deve ter pelo menos 6 caracteres'),
  password_confirmation: z.string(),
}).refine((data) => data.password === data.password_confirmation, {
  message: "Senhas não coincidem",
  path: ["password_confirmation"],
});

type RegisterFormData = z.infer<typeof registerSchema>;

export default function Register() {
  const [showPassword, setShowPassword] = useState(false);
  const [showPasswordConfirmation, setShowPasswordConfirmation] = useState(false);
  const [registerSuccess, setRegisterSuccess] = useState(false);
  const { register: registerUser, isLoading, user, isAuthenticated } = useAuth();
  const { redirectAfterAuth } = useRedirect();

  // Branding state
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

  // Hydrate branding on mount
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

  // Efeito para redirecionar após registro bem-sucedido
  useEffect(() => {
    if (registerSuccess && isAuthenticated && user) {
      redirectAfterAuth(user);
      setRegisterSuccess(false);
    }
  }, [registerSuccess, isAuthenticated, user, redirectAfterAuth]);

  const form = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      name: '',
      email: '',
      password: '',
      password_confirmation: '',
    },
  });

  const onSubmit = async (data: RegisterFormData) => {
    const { enabled, site_key } = recaptchaConfig;
    const captcha_action = 'register';
    let captcha_token = '';

    if (enabled && site_key) {
      try {
        captcha_token = await getRecaptchaToken(site_key, captcha_action);
        if (!captcha_token) {
          await new Promise((r) => setTimeout(r, 300));
          captcha_token = await getRecaptchaToken(site_key, captcha_action);
        }
      } catch (e) {
        console.warn('Recaptcha generation failed, proceeding without token:', e);
      }
    }

    const success = await registerUser({
      name: data.name,
      email: data.email,
      password: data.password,
      password_confirmation: data.password_confirmation,
      captcha_token,
      captcha_action,
    });
    if (success) {
      setRegisterSuccess(true);
    }
  };

  return (
    <InclusiveSiteLayout>
      <section className="relative py-12">
        {/* Elementos decorativos de fundo */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -left-40 w-80 h-80 bg-blue-500/20 rounded-full blur-3xl"></div>
          <div className="absolute -bottom-40 -right-40 w-80 h-80 bg-blue-400/20 rounded-full blur-3xl"></div>
          <div className="absolute top-1/2 left-1/4 w-60 h-60 bg-blue-300/10 rounded-full blur-2xl"></div>
          <div className="absolute bottom-1/4 right-1/3 w-40 h-40 bg-blue-200/10 rounded-full blur-xl"></div>
        </div>

        <div className="relative z-10 flex w-full max-w-6xl mx-auto px-4">
          {/* Lado esquerdo - Branding */}
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
                
                 {/* Mobile Heading */}
                <div className="flex-1 text-center lg:hidden">
                  <BrandLogo alt={institutionName || 'Logo'} className="h-10 mx-auto mb-2" />
                  <h1 className="text-lg font-bold text-primary">{institutionName}</h1>
                </div>

                {/* Desktop Heading */}
                <div className="flex-1 text-right hidden lg:block">
                  <h1 className="text-2xl font-bold text-slate-800">Crie sua Conta</h1>
                  <p className="text-xs text-muted-foreground">Preencha os dados abaixo</p>
                </div>
              </div>

              {/* Formulário */}
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-primary font-medium">Nome Completo</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Seu nome completo"
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
                              placeholder="Mínimo 6 caracteres"
                              className="border-primary/20 focus:border-primary focus:ring-primary pr-10"
                              {...field}
                            />
                            <button
                              type="button"
                              className="absolute inset-y-0 right-0 pr-3 flex items-center"
                              onClick={() => setShowPassword(!showPassword)}
                            >
                              {showPassword ? (
                                <EyeOff className="h-4 w-4 text-muted-foreground hover:text-primary" />
                              ) : (
                                <Eye className="h-4 w-4 text-muted-foreground hover:text-primary" />
                              )}
                            </button>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="password_confirmation"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-primary font-medium">Confirmar Senha</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Input
                              type={showPasswordConfirmation ? 'text' : 'password'}
                              placeholder="Repita a senha"
                              className="border-primary/20 focus:border-primary focus:ring-primary pr-10"
                              {...field}
                            />
                            <button
                              type="button"
                              className="absolute inset-y-0 right-0 pr-3 flex items-center"
                              onClick={() => setShowPasswordConfirmation(!showPasswordConfirmation)}
                            >
                              {showPasswordConfirmation ? (
                                <EyeOff className="h-4 w-4 text-muted-foreground hover:text-primary" />
                              ) : (
                                <Eye className="h-4 w-4 text-muted-foreground hover:text-primary" />
                              )}
                            </button>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button 
                    type="submit" 
                    className="w-full bg-primary hover:bg-blue-700 text-white font-medium rounded-md mt-2" 
                    disabled={isLoading}
                  >
                    {isLoading ? 'Criando conta...' : 'Criar Conta'}
                  </Button>
                </form>
              </Form>

              <div className="text-center text-sm mt-6">
                <span className="text-muted-foreground">Já tem uma conta? </span>
                <Link to="/login" className="text-primary underline hover:text-blue-700 font-medium">
                  Entre aqui
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </InclusiveSiteLayout>
  );
}