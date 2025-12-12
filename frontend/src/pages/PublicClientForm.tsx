import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useParams, Link } from 'react-router-dom';
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
import { toast } from 'sonner';
// Removido uso de CPF no formulário público
import { Eye, EyeOff, ArrowLeft } from 'lucide-react';
import { phoneApplyMask, phoneRemoveMask } from '@/lib/masks/phone-apply-mask';
// import { useGenericApi } from '@/hooks/useGenericApi';
import { 
  activeClientsService, 
  ActiveClientStep1Data, 
  ActiveClientCompleteData 
} from '@/services/activeClientsService';
import { useFormToken } from '@/hooks/useFormToken';
import InclusiveSiteLayout from '@/components/layout/InclusiveSiteLayout';



/**
 * formSchema
 * pt-BR: Validação do formulário público sem CPF.
 * en-US: Public form validation schema without CPF.
 */
const formSchema = z.object({
  name: z.string().min(2, 'Nome é obrigatório'),
  email: z.string().email('E-mail inválido'),
  // pt-BR: Telefone com DDI; valida entre 10 e 15 dígitos.
  // en-US: Phone with country code; validate between 10 and 15 digits.
  phone: z.string().refine((val) => {
    const digits = (val || '').replace(/\D/g, '');
    return digits.length >= 10 && digits.length <= 15;
  }, 'Número de telefone é obrigatório'),
  password: z.string().min(6, 'Senha deve ter pelo menos 6 caracteres'),
  confirmPassword: z.string().min(6, 'Confirmação de senha é obrigatória'),
  termsAccepted: z.boolean().refine(val => val === true, {
    message: 'Você deve concordar com os Termos de Uso'
  }),
  privacyAccepted: z.boolean().refine(val => val === true, {
    message: 'Você deve concordar com a Política de Privacidade'
  })
}).refine(data => data.password === data.confirmPassword, {
  message: 'As senhas não coincidem',
  path: ['confirmPassword']
});

type FormData = z.infer<typeof formSchema>;

/**
 * PublicClientForm
 * pt-BR: Página pública de cadastro de clientes alinhada ao tema do Aeroclube de Juiz de Fora (ACJF).
 *        Atualiza paleta para tons de azul e identidade institucional, preservando lógica existente.
 * en-US: Public registration page themed to Aeroclube de Juiz de Fora.
 *        Uses blue palette and institutional identity, keeping existing logic intact.
 */
export default function PublicClientForm() {
  const { cpf } = useParams<{ cpf: string }>();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // console.log('ActiveClientsService',activeClientsService);
  
  // Hook para gerenciar token de segurança
  const { token, isLoading: tokenLoading, generateToken, isTokenValid } = useFormToken();

  /**
   * Gera token de segurança ao carregar o componente
   */
  useEffect(() => {
    generateToken();
  }, [generateToken]);

  // Estado de loading das operações
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRedirecting, setIsRedirecting] = useState(false);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      email: '',
      phone: '',
      password: '',
      confirmPassword: '',
      termsAccepted: false,
      privacyAccepted: false
    },
  });

  /**
   * onSubmit
   * pt-BR: Submete o formulário público sem CPF.
   * en-US: Submits the public form without CPF.
   */
  const onSubmit = async (data: FormData) => {
    if (!isTokenValid()) {
      toast.error('Token de segurança inválido. Recarregue a página.');
      return;
    }

    setIsSubmitting(true);
    try {
      // Preparar dados completos incluindo password
      const completeData: ActiveClientCompleteData = {
        name: data.name,
        // cpf removido do fluxo público
        email: data.email,
        phone: phoneRemoveMask(data.phone),
        termsAccepted: data.termsAccepted,
        privacyAccepted: data.privacyAccepted,
        password: data.password
      } as ActiveClientCompleteData;

      // Enviar dados completos diretamente para finalização
      const response = await activeClientsService.finalizeRegistration(completeData, token!);
      
      if (response) {
        const resAny = response as any;
        // console.log('Resposta final:', response);

        const redirect : string = resAny?.success?.redirect || '/login';
        toast.success('Conta criada com sucesso!');
        form.reset();
        
        // Aguardar 2 segundos para que o usuário veja a mensagem de sucesso antes do redirect
        if(redirect){
          setIsRedirecting(true);
          setTimeout(() => {
            window.location.href = redirect;
          }, 3000);
        }
        // Gerar novo token para próxima utilização
        // generateToken();
      }
    } catch (error) {
      console.error('Erro ao criar conta:', error);
      
      /**
       * handleValidationErrors
       * pt-BR: Trata erros de validação estruturados do backend, mapeando-os para os campos do formulário
       *        e exibindo uma mensagem amigável ao usuário.
       * en-US: Handles backend structured validation errors by mapping them to form fields
       *        and showing a user-friendly message.
       */
      const handleValidationErrors = (err: any) => {
        const body = err?.body || err?.response?.data || null;
        if (!body) return false;

        const { message, errors } = body;
        if (errors && typeof errors === 'object') {
          let firstMessage: string | null = null;

          const normalizeField = (field: string): string => {
            switch (field) {
              case 'email': return 'email';
              case 'name': return 'name';
              case 'phone':
              case 'telefone': return 'phone';
              case 'password':
              case 'senha': return 'password';
              case 'confirmPassword':
              case 'password_confirmation': return 'confirmPassword';
              case 'terms':
              case 'termsAccepted': return 'termsAccepted';
              case 'privacy':
              case 'privacyAccepted': return 'privacyAccepted';
              default: return field;
            }
          };

          Object.keys(errors).forEach((field) => {
            const fieldErrors = errors[field];
            if (Array.isArray(fieldErrors) && fieldErrors.length > 0) {
              const msg = String(fieldErrors[0]);
              if (!firstMessage) firstMessage = msg;
              const path = normalizeField(field);
              // Marca erro no campo correspondente (server-side)
              form.setError(path as any, { type: 'server', message: msg });
            }
          });

          // Mensagem principal para toast
          const toastMsg = firstMessage || message || 'Erro de validação. Corrija os campos destacados.';
          toast.error(toastMsg);
          return true;
        }

        // Fallback para mensagem simples
        if (message && String(message).toLowerCase().includes('valida')) {
          toast.error(message);
          return true;
        }

        return false;
      };

      // Tenta tratar como erro de validação estruturado; caso contrário, mensagem genérica
      const handled = handleValidationErrors(error);
      if (!handled) {
        toast.error('Erro ao criar conta. Tente novamente.');
      }
    } finally {
      setIsSubmitting(false);
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
          {/* Lado esquerdo - Ícone e elementos decorativos */}
          <div className="hidden lg:flex lg:w-1/2 items-center justify-center relative">
            <div className="text-center">
              {/* Ícone principal */}
              <div className="w-64 h-64 bg-white/10 backdrop-blur-sm rounded-3xl flex items-center justify-center mb-8 mx-auto border border-white/20">
                <div className="w-32 h-32 bg-white rounded-2xl flex items-center justify-center">
                  <svg className="w-20 h-20 text-blue-600" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                    <path d="M19 14v3h3v2h-3v3h-2v-3h-3v-2h3v-3h2z"/>
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
                  <img src="/logo.png" alt="Aeroclube JF" className="h-10 mx-auto mb-2" />
                  <h1 className="text-xl font-bold text-blue-700">Aeroclube de Juiz de Fora</h1>
                </div>
              </div>

            <p className="text-blue-600 text-sm mb-6 text-center">
              Para iniciar sua jornada aeronáutica, crie sua conta.
            </p>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-blue-700 font-medium">Nome completo*</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Nome completo"
                            className="border-blue-200 focus:border-blue-500 focus:ring-blue-500"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage className="text-red-500 text-xs" />
                      </FormItem>
                    )}
                  />

                {/* Campo CPF removido do formulário público */}

                <FormField
                  control={form.control}
                  name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-blue-700 font-medium">E-mail*</FormLabel>
                        <FormControl>
                          <Input
                            type="email"
                            placeholder="E-mail"
                            className="border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage className="text-red-500 text-xs" />
                      </FormItem>
                    )}
                  />

                <FormField
                  control={form.control}
                  name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-blue-700 font-medium">Número de telefone*</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="+55 (11) 99999-9999"
                            className="border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                            {...field}
                            value={field.value || ''}
                            onChange={(e) => field.onChange(phoneApplyMask(e.target.value))}
                          />
                        </FormControl>
                        <FormMessage className="text-red-500 text-xs" />
                      </FormItem>
                    )}
                  />

                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-blue-700 font-medium">Senha*</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input
                            type={showPassword ? 'text' : 'password'}
                            placeholder="Digite sua senha"
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
                      <FormMessage className="text-red-500 text-xs" />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="confirmPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-blue-700 font-medium">Confirmar senha*</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input
                            type={showConfirmPassword ? 'text' : 'password'}
                            placeholder="Confirme sua senha"
                            className="border-gray-300 focus:border-blue-500 focus:ring-blue-500 pr-10"
                            {...field}
                          />
                          <button
                            type="button"
                            className="absolute inset-y-0 right-0 pr-3 flex items-center"
                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          >
                            {showConfirmPassword ? (
                              <EyeOff className="h-4 w-4 text-blue-400" />
                            ) : (
                              <Eye className="h-4 w-4 text-blue-400" />
                            )}
                          </button>
                        </div>
                      </FormControl>
                      <FormMessage className="text-red-500 text-xs" />
                    </FormItem>
                  )}
                />

                {/* Checkboxes de termos */}
                <div className="space-y-3 pt-2">
                  <FormField
                    control={form.control}
                    name="termsAccepted"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                              className="border-blue-300 data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel className="text-sm text-blue-600">
                              Ao criar uma conta, você concorda com os{' '}
                              <span onClick={() => window.open('https://yellowbc.seuclubedevantagens.com.br/tu/', '_blank')} className="text-blue-600 underline cursor-pointer">
                                Termos de Uso
                              </span>
                            </FormLabel>
                            <FormMessage className="text-red-500 text-xs" />
                          </div>
                        </FormItem>
                      )}
                    />

                  <FormField
                    control={form.control}
                    name="privacyAccepted"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                              className="border-gray-300 data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel className="text-sm text-blue-600">
                              Ao criar uma conta, você concorda com a{' '}
                              <span onClick={() => window.open('https://yellowyellowbc.clubedefidelidade.com/privacy_policy', '_blank')} className="text-blue-600 underline cursor-pointer">
                                Política de Privacidade
                              </span>
                            </FormLabel>
                            <FormMessage className="text-red-500 text-xs" />
                          </div>
                        </FormItem>
                      )}
                    />
                </div>

                <Button
                  type="submit"
                  disabled={isSubmitting || tokenLoading || isRedirecting || !isTokenValid()}
                  className="w-full bg-blue-700 hover:bg-blue-800 text-white font-medium py-3 rounded-lg mt-6"
                >
                  {tokenLoading ? 'Carregando...' : isSubmitting ? 'Criando conta...' : isRedirecting ? 'Redirecionando...' : 'Criar Conta'}
                </Button>

                <div className="text-center mt-4">
                  <Link to="/login" className="text-blue-600 text-sm underline hover:text-blue-800 font-medium">
                    Já tem uma conta? Fazer Login
                  </Link>
                </div>
              </form>
            </Form>
          </div>
        </div>
        {/* Fecha o contêiner externo da seção */}
        </div>
      </section>
    </InclusiveSiteLayout>
  );
}