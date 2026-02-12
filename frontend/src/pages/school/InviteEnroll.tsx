import React, { useEffect, useMemo, useState, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogAction } from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import InclusiveSiteLayout from '@/components/layout/InclusiveSiteLayout';
import { publicCoursesService } from '@/services/publicCoursesService';
import { publicEnrollmentService } from '@/services/publicEnrollmentService';
import { useToast } from '@/hooks/use-toast';
import { phoneApplyMask, phoneRemoveMask } from '@/lib/masks/phone-apply-mask';
import { Eye, EyeOff, CheckCircle2 } from 'lucide-react';

import { MathCaptchaWidget, MathCaptchaRef } from '@/components/ui/MathCaptchaWidget';

/**
 * extractCourseErrorMessage
 * pt-BR: Extrai mensagem amigável quando a busca do curso falha.
 * en-US: Extracts a friendly message when course fetch fails.
 */
function extractCourseErrorMessage(err: any): string {
  try {
    let body: any = (err && (err.body || err.response?.data)) || err;
    if (typeof body === 'string') {
      try { body = JSON.parse(body); } catch { /* noop */ }
    }
    const msg = body?.error || body?.message;
    if (typeof msg === 'string' && msg.trim()) return msg;
  } catch { /* noop */ }
  return 'Curso não encontrado';
}


/**
 * InviteEnroll
 * pt-BR: Página pública de convite para matrícula em um curso específico, acessada por link.
 *        Exibe formulário com Nome, Telefone, Email e Senha. Ao enviar, registra o
 *        cliente e cria a matrícula no curso indicado, enviando e-mail de boas-vindas.
 * en-US: Public invitation page for enrolling in a specific course via link.
 *        Displays a form with Name, Phone, Email and Password. On submit, registers the
 *        client and creates the enrollment for the given course, sending a welcome email.
 */
export default function InviteEnroll() {
  const { id: idOrSlug, token: tokenFromPath } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();

  /**
   * courseQuery
   * pt-BR: Busca curso público por slug/id para exibir título e obter `id` para matrícula.
   * en-US: Fetch public course by slug/id to show title and get `id` for enrollment.
   */
  const { data: course, isLoading, error } = useQuery({
    queryKey: ['cursos', 'invite-enroll', idOrSlug],
    queryFn: async () => (idOrSlug ? publicCoursesService.getBySlug(String(idOrSlug)) : null),
    enabled: !!idOrSlug,
  });
  // console.log('course', course);

  const courseId = useMemo(() => Number((course as any)?.id || 0), [course]);
  const courseSlug = useMemo(() => String((course as any)?.slug || (course as any)?.token || idOrSlug || ''), [course, idOrSlug]);
  const courseTitle = useMemo(() => String(((course as any)?.titulo || (course as any)?.nome || 'Curso')), [course]);

  /**
   * courseLoadGuard
   * pt-BR: Redireciona quando o curso não for encontrado ou falhar ao carregar.
   * en-US: Redirects when the course is not found or fails to load.
   */
  useEffect(() => {
    if (isLoading) return;
    if (error) {
      const msg = extractCourseErrorMessage(error);
      toast({ title: 'Curso não encontrado', description: msg, variant: 'destructive' });
      navigate('/cursos');
      return;
    }
    if (courseId === 0) {
      toast({ title: 'Curso não encontrado', description: 'Não é possível abrir a página de inscrição sem um curso válido.', variant: 'destructive' });
      navigate('/cursos');
    }
  }, [isLoading, error, courseId, navigate, toast]);

  /**
   * inviteToken
   * pt-BR: Obtém token do convite da URL (segmento de caminho ou query string).
   * en-US: Gets invite token from URL (path segment or query string).
   */
  const inviteToken = useMemo(() => {
    const search = new URLSearchParams(location.search);
    return String(tokenFromPath || search.get('token') || '');
  }, [tokenFromPath, location.search]);

  // Form state
  const [institution, setInstitution] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [privacyAccepted, setPrivacyAccepted] = useState<boolean>(true);
  const [termsAccepted, setTermsAccepted] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState(false);
  const [registrationSuccess, setRegistrationSuccess] = useState(false);
  const [successModalOpen, setSuccessModalOpen] = useState(false);
  // Field-level errors from API validation
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  // Security helpers: honeypot & time-trap
  const [formRenderedAt, setFormRenderedAt] = useState<number>(() => Date.now());
  const [hpField, setHpField] = useState<string>('');
  // Security helpers: honeypot & time-trap

  
  // Math CAPTCHA state
  const mathWidgetRef = useRef<MathCaptchaRef>(null);
  const [challenge, setChallenge] = useState<{ a: number; b: number; answer: number | null }>({ a: 0, b: 0, answer: null });

  useEffect(() => {
    setFormRenderedAt(Date.now());
  }, []);

  /**
   * onRegistrationSuccessEffect
   * pt-BR: Abre modal de próximo passo quando o cadastro é concluído.
   * en-US: Opens next-step modal when registration completes.
   */
  useEffect(() => {
    if (registrationSuccess) {
      setSuccessModalOpen(true);
    }
  }, [registrationSuccess]);

  /**
   * handlePhoneChange
   * pt-BR: Aplica máscara de telefone enquanto o usuário digita e limpa erro do campo.
   * en-US: Applies phone mask as the user types and clears field error.
   */
  const handlePhoneChange = (value: string) => {
    const masked = phoneApplyMask(value);
    setPhone(masked);
    setFieldErrors((prev) => ({ ...prev, phone: '' }));
  };

  /**
   * isPhoneInvalid
   * pt-BR: Valida telefone com DDI; se informado, exige entre 10 e 15 dígitos.
   * en-US: Validates phone with country code; if provided, requires 10–15 digits.
   */
  const isPhoneInvalid = useMemo(() => {
    const digits = phoneRemoveMask(phone || '');
    if (!phone) return false; // phone é opcional
    return digits.length < 10 || digits.length > 15;
  }, [phone]);

  /**
   * parseApiError
   * pt-BR: Extrai `message` e `errors` de uma resposta de erro da API (BaseApiService),
   *        normalizando para um objeto simples com mapa de erros por campo.
   * en-US: Extracts `message` and `errors` from an API error response (BaseApiService),
   *        normalizing into a simple object with a field error map.
   */
  const parseApiError = (err: any): { message: string; fieldErrors: Record<string, string>; details: string[] } => {
    let body = (err && (err.body || err.response?.data)) || {};
    if (typeof body === 'string') {
      try { body = JSON.parse(body); } catch { /* noop */ }
    }
    const msg = String(body?.message || err?.message || 'Erro de validação');
    const errorsObj: Record<string, string[] | string> = body?.errors || {};
    const fErrors: Record<string, string> = {};
    const details: string[] = [];
    if (errorsObj && typeof errorsObj === 'object') {
      Object.entries(errorsObj).forEach(([field, messages]) => {
        const firstMsg = Array.isArray(messages) ? String(messages[0] || '') : String(messages || '');
        if (firstMsg) {
          fErrors[field] = firstMsg;
          details.push(firstMsg);
        }
      });
    }
    return { message: msg, fieldErrors: fErrors, details };
  };

  /**
   * passwordStrength
   * pt-BR: Calcula força da senha com base em comprimento e diversidade de caracteres.
   * en-US: Calculates password strength based on length and character diversity.
   */
  const passwordStrength = useMemo(() => {
    const v = password || '';
    let score = 0;
    if (v.length >= 6) score += 1;
    if (/[A-Z]/.test(v)) score += 1;
    if (/[a-z]/.test(v)) score += 1;
    if (/[0-9]/.test(v)) score += 1;
    if (/[^A-Za-z0-9]/.test(v)) score += 1;
    return Math.min(score, 5);
  }, [password]);

  /**
   * isPasswordTooWeak
   * pt-BR: Segue regra mínima do backend (>=6). Exibe alerta visual se fraca.
   * en-US: Follows backend minimum rule (>=6). Shows visual alert if weak.
   */
  const isPasswordTooWeak = useMemo(() => password.length < 6, [password]);

  /**
   * passwordsMismatch
   * pt-BR: Verifica se senha e confirmação não são iguais.
   * en-US: Checks if password and confirmation do not match.
   */
  const passwordsMismatch = useMemo(() => !!confirmPassword && password !== confirmPassword, [password, confirmPassword]);

  /**
   * focusFirstError
   * pt-BR: Rola suavemente até o primeiro campo com erro e aplica foco.
   * en-US: Smoothly scrolls to the first field with error and focuses it.
   */
  const focusFirstError = (errors: Record<string, string>) => {
    const order = ['name', 'phone', 'email', 'institution', 'password', 'privacyAccepted', 'termsAccepted'];
    for (const key of order) {
      if (errors[key]) {
        const targetId = key === 'privacyAccepted' ? 'privacy' : key === 'termsAccepted' ? 'terms' : key;
        const el = document.getElementById(targetId);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          if ('focus' in el) (el as HTMLElement).focus();
        }
        break;
      }
    }
  };

  /**
   * canSubmit
   * pt-BR: Habilita o envio quando campos obrigatórios estão preenchidos.
   * en-US: Enables submit when required fields are filled.
   */
  const canSubmit = useMemo(() => {
    // pt-BR: Permite enviar mesmo se o curso não carregar; cai em fallback de "registrar interesse".
    // en-US: Allows submit even if course fails to load; falls back to "register interest".
    const base = !!name && !!email && !!password && !!confirmPassword && !!institution && privacyAccepted && termsAccepted;
    if (!base) return false;
    if (isPasswordTooWeak) return false;
    if (passwordsMismatch) return false;
    if (phone && isPhoneInvalid) return false;
    // pt-BR: Exige curso válido para liberar envio.
    // en-US: Requires valid course to enable submission.
    if (courseId <= 0) return false;
    
    // Require Math answer
    if (!challenge.answer) return false;
    
    return true;
  }, [name, email, password, confirmPassword, institution, privacyAccepted, termsAccepted, phone, isPhoneInvalid, isPasswordTooWeak, passwordsMismatch, courseId, challenge.answer]);

  /**
   * handleSubmit
   * pt-BR: Envia dados para o endpoint público. Em sucesso, mostra toast e disponibiliza
   *        botão para ir ao curso na área do aluno. Opcionalmente, navega automaticamente.
   * en-US: Sends data to public endpoint. On success, shows toast and provides button
   *        to go to the course in the student area. Optionally navigates automatically.
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    // pt-BR: Segurança adicional — bloqueia envio se `courseId` inválido.
    // en-US: Additional safety — block submission if `courseId` is invalid.
    if (courseId <= 0) {
      toast({ title: 'Curso não encontrado', description: 'Não é possível prosseguir com a matrícula sem um curso válido.', variant: 'destructive' });
      return;
    }
    setSubmitting(true);
    setFieldErrors({});
    setRegistrationSuccess(false);
    try {
      // Math Challenge Payload
      const challenge_a = challenge.a;
      const challenge_b = challenge.b;
      const challenge_answer = challenge.answer;
   
      const resp = await publicEnrollmentService.registerAndEnroll({
        institution,
        name,
        email,
        password,
        phone,
        id_curso: courseId,
        privacyAccepted,
        termsAccepted,
        invite_token: inviteToken || undefined,
        // Security payload (Math Challenge)
        challenge_a,
        challenge_b,
        challenge_answer,
        form_rendered_at: formRenderedAt,
        hp_field: hpField,
      });
      /**
       * resolveSuccess
       * pt-BR: Determina sucesso usando o formato de resposta do backend
       *        (`{ client: {id}, matricula: {id} }`).
       * en-US: Determines success using backend response shape
       *        (`{ client: {id}, matricula: {id} }`).
       */
      const success = Boolean(
        (resp && (resp.matricula?.id || resp.client?.id)) || resp?.success
      );
      setRegistrationSuccess(success);
      // Sucesso: sem toast para evitar duplicidade, o modal cuidará do próximo passo visível.
      // Opcional: navegar para a página do aluno (exige login)
      // navigate(`/aluno/cursos/${courseSlug}`);
    } catch (err: any) {
      const { message, fieldErrors: fErrors, details } = parseApiError(err);
      setFieldErrors(fErrors);
      setTimeout(() => focusFirstError(fErrors), 0);
      toast({ title: 'Erro de validação', description: details.length ? details.join('; ') : message, variant: 'destructive' });
      // Reset Math Challenge on error
      if (mathWidgetRef.current) mathWidgetRef.current.reset();
      setChallenge(prev => ({ ...prev, answer: null }));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <InclusiveSiteLayout>
      <div className="container mx-auto py-6">
        <Card>
          <CardHeader>
            <CardTitle>Convite de matrícula</CardTitle>
            <CardDescription>
              {isLoading ? 'Carregando curso…' : error ? extractCourseErrorMessage(error) : `Inscreva-se em: ${courseTitle}`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            
            <form className="grid grid-cols-1 md:grid-cols-2 gap-4" onSubmit={handleSubmit}>
              <div className="space-y-2 md:col-span-2">
                <Label>Nome completo</Label>
                <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Seu nome" required aria-invalid={!!fieldErrors.name} className={fieldErrors.name ? 'border-red-500 focus-visible:ring-red-500' : ''} />
                {fieldErrors.name && (
                  <p className="text-sm text-destructive">{fieldErrors.name}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label>Telefone</Label>
                <Input id="phone" value={phone} onChange={(e) => handlePhoneChange(e.target.value)} placeholder="(DDD) 99999-9999" aria-invalid={!!fieldErrors.phone || isPhoneInvalid} className={(fieldErrors.phone || isPhoneInvalid) ? 'border-red-500 focus-visible:ring-red-500' : ''} />
                {(fieldErrors.phone || isPhoneInvalid) && (
                  <p className="text-sm text-destructive">{fieldErrors.phone || 'Telefone inválido. Use DDI + número (10–15 dígitos).'}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label>E-mail</Label>
                <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="seu@email.com" required aria-invalid={!!fieldErrors.email} className={fieldErrors.email ? 'border-red-500 focus-visible:ring-red-500' : ''} />
                {fieldErrors.email && (
                  <p className="text-sm text-destructive">{fieldErrors.email}</p>
                )}
              </div>
              {/* pt-BR: Campo Instituição como Select obrigatório */}
              {/* en-US: Institution field as required Select */}
              <div className="space-y-2 md:col-span-2">
                <Label>Instituição</Label>
                <Select value={institution} onValueChange={(val) => setInstitution(val)} required>
                  <SelectTrigger id="institution" className={fieldErrors.institution ? 'border-red-500 focus:ring-red-500' : ''}>
                    <SelectValue placeholder="Selecione o tipo de instituição" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Escola Particular">Escola Particular</SelectItem>
                    <SelectItem value="Escola Municipal">Escola Municipal</SelectItem>
                    <SelectItem value="Escola Estadual">Escola Estadual</SelectItem>
                    <SelectItem value="Clínica">Clínica</SelectItem>
                    <SelectItem value="Outra">Outra</SelectItem>
                  </SelectContent>
                </Select>
                {fieldErrors.institution && (
                  <p className="text-sm text-destructive">{fieldErrors.institution}</p>
                )}
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>Senha</Label>
                {/* pt-BR: Campo de senha com alternância de visibilidade (olho). */}
                {/* en-US: Password field with visibility toggle (eye). */}
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Crie uma senha"
                    required
                    aria-invalid={!!fieldErrors.password || isPasswordTooWeak}
                    className={(fieldErrors.password || isPasswordTooWeak) ? 'border-red-500 focus-visible:ring-red-500 pr-10' : 'pr-10'}
                  />
                  <button
                    type="button"
                    aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-muted-foreground hover:text-foreground"
                    onClick={() => setShowPassword((v) => !v)}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
                {fieldErrors.password && (
                  <p className="text-sm text-destructive">{fieldErrors.password}</p>
                )}
                {!fieldErrors.password && (
                  <p className={`text-sm ${isPasswordTooWeak ? 'text-destructive' : 'text-muted-foreground'}`}>
                    {isPasswordTooWeak ? 'Senha muito curta (mínimo 6 caracteres).' : `Força da senha: ${(['Muito fraca','Fraca','Média','Forte','Muito forte'])[passwordStrength - 1] || 'Muito fraca'}`}
                  </p>
                )}
              </div>

              {/* pt-BR: Campo de confirmação de senha com alternância de visibilidade (olho). */}
              {/* en-US: Confirm password field with visibility toggle (eye). */}
              <div className="space-y-2 md:col-span-2">
                <Label>Confirmar senha</Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repita a senha"
                    required
                    aria-invalid={passwordsMismatch}
                    className={passwordsMismatch ? 'border-red-500 focus-visible:ring-red-500 pr-10' : 'pr-10'}
                  />
                  <button
                    type="button"
                    aria-label={showConfirmPassword ? 'Ocultar confirmação' : 'Mostrar confirmação'}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-muted-foreground hover:text-foreground"
                    onClick={() => setShowConfirmPassword((v) => !v)}
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
                {passwordsMismatch && (
                  <p className="text-sm text-destructive">As senhas não coincidem.</p>
                )}
              </div>
              <div className="flex items-center space-x-2 md:col-span-2">
                <Checkbox id="privacy" checked={privacyAccepted} onCheckedChange={(v) => setPrivacyAccepted(!!v)} />
                <Label htmlFor="privacy">Aceito a política de privacidade</Label>
                {fieldErrors.privacyAccepted && (
                  <p className="text-sm text-destructive">{fieldErrors.privacyAccepted}</p>
                )}
              </div>
              <div className="flex items-center space-x-2 md:col-span-2">
                <Checkbox id="terms" checked={termsAccepted} onCheckedChange={(v) => setTermsAccepted(!!v)} />
                <Label htmlFor="terms">Aceito os termos de uso</Label>
                {fieldErrors.termsAccepted && (
                  <p className="text-sm text-destructive">{fieldErrors.termsAccepted}</p>
                )}
              </div>

              <div className="md:col-span-2 flex flex-col items-center gap-4">
                <MathCaptchaWidget
                  ref={mathWidgetRef}
                  onVerify={(a, b, answer) => setChallenge({ a, b, answer })}
                />
                
                <div className="flex items-center gap-2 w-full justify-start">
                  <Button type="submit" disabled={!canSubmit || submitting}>
                    {submitting ? 'Enviando…' : 'Confirmar matrícula'}
                  </Button>
                </div>

                {/* Honeypot (should stay empty) */}
                <input
                  type="text"
                  value={hpField}
                  onChange={(e) => setHpField(e.target.value)}
                  style={{ position: 'absolute', left: '-9999px', opacity: 0 }}
                  aria-hidden="true"
                  tabIndex={-1}
                />
              </div>
            </form>
          </CardContent>
        </Card>
        {/**
         * SuccessNextStepAlertDialog
         * pt-BR: Modal bloqueante de sucesso com título do curso destacado e CTA.
         * en-US: Blocking success modal with highlighted course title and CTA.
         */}
        <AlertDialog open={successModalOpen} onOpenChange={setSuccessModalOpen}>
          <AlertDialogContent className="sm:max-w-md">
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2 justify-center">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
                Cadastro concluído
              </AlertDialogTitle>
              <AlertDialogDescription>
                {course?.title ? (
                  <span className="block text-base font-semibold text-foreground">{String((course as any)?.title)}</span>
                ) : (
                  'Matrícula confirmada com sucesso.'
                )}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="space-y-2 text-sm">
              <p>Enviamos um e-mail de boas-vindas.</p>
              <p className="font-medium">Próximo passo: acessar seu curso agora.</p>
            </div>
            <AlertDialogFooter>
              <AlertDialogAction
                onClick={() => navigate(`/aluno/cursos/${courseSlug}`)}
                title="Abrir consumo do curso"
              >
                Ir para o curso
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </InclusiveSiteLayout>
  );
}
