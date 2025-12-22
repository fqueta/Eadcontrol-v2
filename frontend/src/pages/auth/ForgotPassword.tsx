import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useState } from 'react';

import { AuthLayout } from '@/components/auth/AuthLayout';
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
import { getSiteKey, getRecaptchaToken } from '@/lib/recaptcha';
import BrandLogo from '@/components/branding/BrandLogo';
import { getInstitutionName, getInstitutionNameAsync, getInstitutionSlogan, hydrateBrandingFromPublicApi } from '@/lib/branding';

const forgotPasswordSchema = z.object({
  email: z.string().email('Email inválido'),
});

type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;

export default function ForgotPassword() {
  /**
   * ForgotPassword
   * pt-BR: Página de solicitação de recuperação de senha (envio de link por email).
   *        Aplica o tema azul do Aeroclube de Juiz de Fora, mantendo a lógica original.
   * en-US: Password recovery request page (sends reset link via email).
   *        Applies ACJF blue theme while preserving the original logic.
   */
  const [isLoading, setIsLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [institutionName, setInstitutionName] = useState<string>(() => getInstitutionName());
  const [institutionSlogan, setInstitutionSlogan] = useState<string>(() => getInstitutionSlogan());

  /**
   * hydrateBranding
   * pt-BR: Carrega nome e slogan pela API pública e aplica com fallback.
   * en-US: Loads name and slogan from public API and applies with fallback.
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

  const form = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: '',
    },
  });

  /**
   * onSubmit
   * pt-BR: Gera um token reCAPTCHA v3 para a ação "forgot_password" e envia
   *        junto com o email para validação no backend.
   * en-US: Generates a reCAPTCHA v3 token for "forgot_password" action and
   *        sends it with the email for backend validation.
   */
  const onSubmit = async (data: ForgotPasswordFormData) => {
    try {
      setIsLoading(true);
      const siteKey = getSiteKey();
      const captcha_action = 'forgot_password';
      const captcha_token = siteKey ? await getRecaptchaToken(siteKey, captcha_action) : '';

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
      <AuthLayout 
        title="Email Enviado" 
        subtitle="Verifique sua caixa de entrada"
      >
        {/* Brand header — ACJF */}
        <div className="flex items-center justify-center gap-3 mb-2">
          {/* Brand logo */}
          <BrandLogo alt="Aeroclube JF" className="h-10" />
          <div>
            <p className="text-sm font-semibold text-blue-800">{institutionName}</p>
            <p className="text-xs text-blue-600">{institutionSlogan}</p>
          </div>
        </div>

        <div className="text-center space-y-4">
          <p className="text-muted-foreground">
            Enviamos um link para redefinir sua senha para o email fornecido.
          </p>
          <div className="space-y-2">
            <Button asChild className="w-full bg-blue-700 hover:bg-blue-800">
              <Link to="/login">Voltar ao Login</Link>
            </Button>
            <Button 
              variant="outline" 
              className="w-full border-blue-300 text-blue-700 hover:bg-blue-50"
              onClick={() => setEmailSent(false)}
            >
              Tentar Novamente
            </Button>
          </div>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout 
      title="Recuperar Senha" 
      subtitle="Digite seu email para redefinir sua senha"
    >
      {/* Brand header — ACJF */}
      <div className="flex items-center justify-center gap-3 mb-2">
        {/* Brand logo */}
        <BrandLogo alt="Aeroclube JF" className="h-10" />
        <div>
          <p className="text-sm font-semibold text-blue-800">{institutionName}</p>
          <p className="text-xs text-blue-600">{institutionSlogan}</p>
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <Input
                    type="email"
                    placeholder="seu@email.com"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <Button 
            type="submit" 
            className="w-full bg-blue-700 hover:bg-blue-800" 
            disabled={isLoading}
          >
            {isLoading ? 'Enviando...' : 'Enviar Link de Recuperação'}
          </Button>
        </form>
      </Form>

      <div className="text-center text-sm">
        <Link to="/login" className="text-blue-700 hover:underline">
          Voltar ao Login
        </Link>
      </div>
    </AuthLayout>
  );
}