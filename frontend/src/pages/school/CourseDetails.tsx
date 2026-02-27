
import React, { useMemo, useState, useEffect, useRef } from 'react';
import { getInstitutionName, getInstitutionWhatsApp } from '@/lib/branding';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import InclusiveSiteLayout from '@/components/layout/InclusiveSiteLayout';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { publicCoursesService } from '@/services/publicCoursesService';
// Removido uso de criação de matrícula autenticada
// Removed authenticated enrollments creation hook
import { toast } from '@/hooks/use-toast';
import { emailsService } from '@/services/emailsService';
import { publicEnrollmentService } from '@/services/publicEnrollmentService';
import { useAuth } from '@/contexts/AuthContext';
import api from '@/lib/axios';
import { useEnrollmentsList } from '@/hooks/enrollments';
import { useAnalytics } from '@/hooks/useAnalytics';
import { phoneApplyMask } from '@/lib/masks/phone-apply-mask';


import { ValidationConflictModal } from '@/components/modals/ValidationConflictModal';
import { PublicCourseComments } from '@/components/school/PublicCourseComments';

/**
 * CourseDetails
 * pt-BR: Página pública de detalhes do curso, inspirada na imagem fornecida.
 *        Mostra título, capa, preço, descrição com destaques, lista de módulos
 *        e um formulário simples de contato/interesse.
 * en-US: Public course details page inspired by the provided image.
 *        Displays title, cover, price box, description and highlights, modules
 *        list, and a simple contact/interest form.
 */
export default function CourseDetails() {
  /**
   * Route params
   * pt-BR: Slug do curso obtido da URL (id/token/slug).
   * en-US: Course slug obtained from URL (id/token/slug).
   */
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { trackEvent } = useAnalytics();

  /**
   * useQuery — course
   * pt-BR: Busca detalhes do curso público pelo slug/id.
   * en-US: Fetches public course details by slug/id.
   */
  const { data: course, isLoading, error } = useQuery({
    queryKey: ['cursos', 'details', id],
    queryFn: async () => (id ? publicCoursesService.getBySlug(String(id)) : null),
    enabled: !!id,
  });

  /**
   * enrollmentGuard — duplicate enrollments
   * pt-BR: Se o usuário for aluno e já estiver matriculado neste curso,
   *        desabilita compra/matrícula e oferece atalho para o curso.
   * en-US: If the user is a student and already enrolled in this course,
   *        disables purchase/enroll and offers a shortcut to the course.
   */
  const permissionId = Number((user as any)?.permission_id ?? 999);
  const isStudent = !!user && permissionId === 7;
  const courseNumericId = useMemo(() => {
    const cid = (course as any)?.id;
    const num = Number(cid);
    return Number.isFinite(num) ? num : undefined;
  }, [course]);
  const clientNumericId = useMemo(() => {
    const candidates = [
      (user as any)?.id_cliente,
      (user as any)?.client_id,
      (user as any)?.cliente_id,
    ];
    for (const v of candidates) {
      const n = Number(v);
      if (Number.isFinite(n) && n > 0) return n;
    }
    return undefined;
  }, [user]);
  const { data: enrollmentsResp } = useEnrollmentsList(
    { page: 1, per_page: 1, id_curso: courseNumericId, id_cliente: clientNumericId, public: '1', situacao: 'mat' } as any,
    { enabled: isStudent && !!courseNumericId }
  );
  const isAlreadyEnrolled = useMemo(() => {
    const arr = (enrollmentsResp as any)?.data || (enrollmentsResp as any)?.items || [];
    return Array.isArray(arr) && arr.length > 0;
  }, [enrollmentsResp]);

  /**
   * Derived fields
   * pt-BR: Título, preço, imagem, descrição e destaques.
   * en-US: Title, price, image, description and highlights.
   */
  const title = useMemo(() => {
    const c: any = course || {};
    return c?.titulo || c?.nome || (id ? `Curso ${id}` : 'Curso');
  }, [course, id]);

  /**
   * Analytics Tracking
   * pt-BR: Rastreia a visualização da página de detalhes do curso.
   * en-US: Tracks the course details page view.
   */
  useEffect(() => {
    if (courseNumericId) {
      trackEvent('view', {
        resource_type: 'App\\Models\\Curso',
        resource_id: courseNumericId,
        url: window.location.href,
        metadata: {
          title: title,
          slug: id
        }
      });
    }
  }, [courseNumericId, trackEvent, title, id]);

  const description = useMemo(() => {
    const c: any = course || {};
    return c?.descricao_curso || c?.descricao || c?.observacoes || '';
  }, [course]);

  /**
   * coverUrl
   * pt-BR: URL da capa do curso, lendo exclusivamente de `config.cover.url`.
   * en-US: Course cover URL, reading exclusively from `config.cover.url`.
   */
  const coverUrl = useMemo(() => {
    const c: any = course || {};
    const url = String(c?.config?.cover?.url || '').trim();
    return url;
  }, [course]);

  const priceBox = useMemo(() => {
    const c: any = course || {};
    const valor = String(c?.valor || '').trim();
    const parcelas = String(c?.parcelas || '').trim();
    const valorParcela = String(c?.valor_parcela || '').trim();
    return { valor, parcelas, valorParcela };
  }, [course]);

  const highlights: string[] = useMemo(() => {
    // pt-BR: Extrai destaques de perguntas/respostas, observações ou descrição.
    // en-US: Extract highlights from Q&A, observations or description.
    const c: any = course || {};
    const items: string[] = [];
    if (Array.isArray(c?.perguntas)) {
      for (const q of c.perguntas) {
        const p = String(q?.pergunta || '').trim();
        if (p) items.push(p);
      }
    }
    // Fallback: quebra descrição em tópicos por linhas com "- "
    const desc = String(c?.descricao_curso || c?.descricao || '').split('\n');
    for (const line of desc) {
      const trimmed = line.trim();
      if (trimmed.startsWith('- ')) items.push(trimmed.replace(/^-\s+/, ''));
    }
    return items.slice(0, 10);
  }, [course]);

  /**
   * renderDescriptionHtml
   * pt-BR: Renderiza a descrição com suporte a HTML usando `dangerouslySetInnerHTML`.
   *        Importante: assume que o HTML recebido já é seguro para renderização.
   * en-US: Renders description with HTML support using `dangerouslySetInnerHTML`.
   *        Important: assumes the incoming HTML is already safe to render.
   */
  const renderDescriptionHtml = (html: string) => (
    <div className="prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: html }} />
  );

  const modules = useMemo(() => {
    const c: any = course || {};
    return Array.isArray(c?.modulos) ? c.modulos : [];
  }, [course]);

  /**
   * Contact form state
   * pt-BR: Estado dos campos do formulário de interesse.
   * en-US: State for interest form fields.
   */
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [cityState, setCityState] = useState('');
  /**
   * submitSuccess / successMessage
   * pt-BR: Estado de sucesso e mensagem exibida após enviar interesse.
   * en-US: Success state and message shown after submitting interest.
   */
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  /**
   * isSubmitting
   * pt-BR: Estado de carregamento para submissão do formulário de interesse.
   * en-US: Loading state for interest form submission.
   */
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Security helpers removed
  const HONEYPOT_FIELD = 'website_verify_extra';

  // Conflict Modal State
  const [conflictModalOpen, setConflictModalOpen] = useState(false);
  const [conflictType, setConflictType] = useState<'email' | 'phone' | null>(null);
  const userFirst = user?.name?.split(' ')[0] || 'Aluno';
  const { isAuthenticated } = useAuth();

  /**
   * handleEmailBlur
   */
  const handleEmailBlur = async () => {
    if (!email || isAuthenticated) return;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return;

    try {
      const { exists } = await publicEnrollmentService.checkEmail(email);
      if (exists) {
        setConflictType('email');
        setConflictModalOpen(true);
      }
    } catch (error) {
      console.error('Failed to check email', error);
    }
  };

  /**
   * resetInterestFormFields
   * pt-BR: Limpa os campos do formulário de interesse após envio.
   * en-US: Clears interest form fields after submission.
   */
  const resetInterestFormFields = () => {
    setFullName('');
    setEmail('');
    setPhone('');
    setCityState('');
  };

  // pt-BR: Não usar o endpoint protegido `/matriculas` no público
  // en-US: Do not use protected `/matriculas` endpoint in public page

  /**
   * handleBuy
   * pt-BR: Abre link de compra quando disponível; caso contrário, redireciona para matrícula.
   * en-US: Opens purchase link when available; otherwise redirects to enrollment.
   */
  /**
   * handleBuy
   * pt-BR: Abre link de compra quando disponível; caso contrário, redireciona para matrícula.
   * en-US: Opens purchase link when available; otherwise redirects to enrollment.
   */
  const handleBuy = () => {
    const c: any = course || {};
    if (isAlreadyEnrolled) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Você já está matriculado neste curso."
      });
      // Direciona para a página do aluno
      if (id) navigate(`/aluno/cursos/${String(id)}`);
      return;
    }
    const link = c?.config?.pagina_venda?.link || '';
    if (link) {
      window.open(link, '_blank');
      return;
    }
    const q = new URLSearchParams({ courseId: String(c?.id || '') }).toString();
    navigate(`/admin/sales/proposals/create?${q}`);
  };

  /**
   * handleSubmitInterest
   * pt-BR: Envia o formulário de interesse, cria matrícula com `situacao=int` e dispara email de boas-vindas.
   * en-US: Submits interest form, creates enrollment with `situacao=int` and triggers welcome email.
   */
  const handleSubmitInterest = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const c: any = course || {};
      const courseId = String(c?.id || '');

      const institution = getInstitutionName() || 'default';
      
      const payload: any = {
        institution,
        id_curso: courseId ? Number(courseId) : undefined,
        id_turma: 0,
      };

      if (isAuthenticated && user) {
        // Authenticated submission
        payload.name = user.name;
        payload.email = user.email;
        payload.phone = user.celular;
        // Skip security checks for trusted users (backend also skips)
      } else {
        // Unauthenticated submission
        if (!fullName || !email) {
          toast({ variant: "destructive", title: "Erro", description: "Informe nome e e-mail para prosseguir." });
           setIsSubmitting(false);
          return;
        }

        let public_form_token = '';
        try {
          const response = await api.post('/public/form-token/public_interest');
          public_form_token = response.data.token;
        } catch (e) {
          console.error('Failed to fetch security token:', e);
        }
        
        payload.name = `Interesse • ${fullName}`;
        payload.email = email;
        payload.phone = phone;
        payload.public_form_token = public_form_token;
      }

      // Registra interesse via endpoint público
      await publicEnrollmentService.registerInterest(payload);

      // Redirection to WhatsApp removed as per user request (only success message is shown)
      // if (isAuthenticated && user) { ... }

      // Envia e-mail de boas-vindas via backend (Brevo); fallback para mailto em caso de falha
      try {
        await emailsService.sendWelcome({
          name: fullName,
          email,
          course_id: courseId ? Number(courseId) : undefined,
          course_title: String(c?.titulo || title),
        });
        toast({
          title: "Sucesso",
          description: "Interesse enviado! Matrícula criada e email de boas-vindas disparado."
        });
        setSubmitSuccess(true);
        setSuccessMessage('Interesse enviado! Em breve entraremos em contato por e-mail.');
        resetInterestFormFields();
      } catch (sendErr) {
        console.warn('Falha ao enviar email via backend (ignorado para UX):', sendErr);
        // Fallback: Apenas notifica sucesso, sem abrir mailto
        toast({
          title: "Sucesso",
          description: "Interesse registrado! Nossa equipe entrará em contato."
        });
        setSubmitSuccess(true);
        setSuccessMessage('Interesse enviado! Em breve entraremos em contato.');
        resetInterestFormFields();
      }
      // Optional: direct to purchase flow if exists
      // handleBuy();
    } catch (err: any) {
      console.error('Erro ao enviar interesse:', err);
      
      // pt-BR: Tenta extrair mensagem de erro amigável do backend (ex: erro de validação)
      // en-US: Tries to extract friendly error message from backend (e.g. validation error)
      let errorMessage = "Falha ao enviar interesse. Tente novamente.";
      
      if (err.body?.errors) {
        const errors = err.body.errors;
        // Pega a primeira mensagem de erro disponível
        const firstErrorKey = Object.keys(errors)[0];
        if (firstErrorKey && Array.isArray(errors[firstErrorKey]) && errors[firstErrorKey].length > 0) {
          errorMessage = errors[firstErrorKey][0];
        }
      } else if (err.body?.message) {
        errorMessage = err.body.message;
      }

      toast({
        variant: "destructive",
        title: "Erro",
        description: errorMessage
      });
      setSubmitSuccess(false);
      setSuccessMessage('');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <InclusiveSiteLayout>
      <section className="py-6 md:py-10 bg-slate-50 dark:bg-black/50 min-h-screen transition-colors duration-500">
        <div className="container mx-auto px-4">
          {/* Header area */}
          {/**
           * Header
           * pt-BR: Usa as mesmas cores do layout (gradiente azul brand) e mantém a identidade visual com a logo via InclusiveSiteLayout.
           * en-US: Uses the same layout colors (brand blue gradient) and keeps visual identity with the logo via InclusiveSiteLayout.
           */}
          {/* Header area - Mesh Gradient Style */}
          <div className="relative overflow-hidden rounded-2xl bg-slate-900 border border-white/5 shadow-2xl mb-8">
             {/* Mesh Gradient Background Elements */}
             <div className="absolute inset-0 z-0 bg-primary/5">
                <div className="absolute top-[-20%] left-[-10%] w-[70%] h-[70%] bg-primary/20 blur-[120px] rounded-full animate-pulse" />
                <div className="absolute bottom-[-20%] right-[-10%] w-[70%] h-[70%] bg-secondary/20 blur-[120px] rounded-full" />
                <div className="absolute top-[20%] right-[10%] w-[40%] h-[40%] bg-primary/10 blur-[100px] rounded-full" />
            </div>
            
            <div className="relative z-10 px-8 py-12 md:py-20">
               <div className="inline-flex items-center px-3 py-1 rounded-full bg-white/10 border border-white/10 backdrop-blur-md text-primary-foreground/90 text-xs font-bold uppercase tracking-widest mb-6">
                Curso Disponível
              </div>
              <h1 className="text-3xl md:text-5xl font-black tracking-tighter text-white mb-4 drop-shadow-sm max-w-4xl">{title}</h1>
              {error && (
                <p className="mt-2 text-sm text-white/90 bg-red-500/20 inline-block px-3 py-1 rounded-md">Falha ao carregar informações do curso.</p>
              )}
            </div>
          </div>

          {/* Main grid */}
          <div className="grid lg:grid-cols-3 gap-8">
            {/* Left: description and highlights */}
            <div className="lg:col-span-2 space-y-8">
              <Card className="border border-slate-200/50 dark:border-white/5 shadow-xl bg-white/50 dark:bg-slate-900/50 backdrop-blur-md overflow-hidden rounded-2xl">
                <CardHeader className="bg-primary/5 dark:bg-primary/10 border-b border-primary/10 dark:border-primary/20 pb-6">
                  <CardTitle className="text-2xl text-primary font-bold">Por que realizar este curso?</CardTitle>
                  <CardDescription className="text-base">
                    Confira os benefícios e o conteúdo programático detalhado.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6 pt-6">
                  {description && renderDescriptionHtml(description)}
                  {highlights.length > 0 && (
                    <div className="bg-primary/5 dark:bg-primary/10 p-5 rounded-lg border border-primary/10 dark:border-primary/20">
                      <h3 className="text-base font-semibold text-primary mb-3 flex items-center gap-2">
                        <span className="text-xl">✨</span> Destaques
                      </h3>
                      <ul className="grid sm:grid-cols-2 gap-2 text-sm">
                        {highlights.map((h, i) => (
                          <li key={i} className="flex items-start gap-2">
                             <span className="text-primary mt-1">•</span>
                             <span className="text-slate-700 dark:text-slate-300">{h}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className="border border-slate-200/50 dark:border-white/5 shadow-xl bg-white/50 dark:bg-slate-900/50 backdrop-blur-md rounded-2xl">
                <CardHeader className="pb-4">
                  <CardTitle className="text-xl">O que você vai aprender?</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {modules.length === 0 && (
                    <p className="text-sm text-muted-foreground italic">Conteúdo do curso será exibido aqui.</p>
                  )}
                  {modules.map((m: any, idx: number) => (
                    <div key={idx} className="rounded-lg border border-slate-200 dark:border-slate-800 p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                      <div className="font-semibold text-primary mb-2">{m?.titulo || `Módulo ${idx + 1}`}</div>
                      {Array.isArray(m?.atividades) && m.atividades.length > 0 && (
                        <ul className="space-y-1.5 ml-1">
                          {m.atividades.map((a: any, j: number) => (
                            <li key={j} className="text-sm text-slate-600 dark:text-slate-400 flex items-center gap-2">
                               <div className="w-1.5 h-1.5 rounded-full bg-slate-300 dark:bg-slate-600" />
                               {a?.titulo || a?.name || `Aula ${j + 1}`}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  ))}
                </CardContent>
              </Card>

              <div className="rounded-2xl bg-gradient-to-r from-slate-900 to-slate-800 text-white p-8 shadow-xl relative overflow-hidden border border-white/10">
                 <div className="absolute top-0 right-0 p-8 opacity-10 font-bold text-9xl leading-none transform translate-x-10 -translate-y-10">
                   %
                 </div>
                <div className="relative z-10">
                    <div className="font-bold text-lg mb-1">Facilidades de pagamento</div>
                    <p className="text-white/90 text-sm md:text-base">
                    Parcelamento facilitado e condições especiais podem ser aplicadas de acordo com a política da escola. Entre em contato para saber mais.
                    </p>
                </div>
              </div>

              <Card className="border border-slate-200/50 dark:border-white/5 shadow-xl bg-white/50 dark:bg-slate-900/50 backdrop-blur-md rounded-2xl">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <span>📧</span> Interessados e contato
                  </CardTitle>
                  <CardDescription>Preencha seus dados para receber mais informações</CardDescription>
                </CardHeader>
                <CardContent>
                  {submitSuccess && successMessage && (
                    <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 dark:bg-emerald-900/20 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400 p-4 text-sm flex items-center gap-2">
                       <span className="text-xl">✅</span> {successMessage}
                    </div>
                  )}
                  {/**
                   * Contact form
                   * pt-BR: Campo de mensagem oculto conforme solicitado; envia interesse criando matrícula.
                   * en-US: Message field hidden as requested; submits interest by creating enrollment.
                   */}
                  {/* Contact form - Smart Logic */}
                  {isAuthenticated ? (
                    <div className="flex flex-col items-center justify-center py-8 gap-4 text-center">
                      <div className="p-4 rounded-full bg-primary/10 dark:bg-primary/20 text-primary mb-2">
                        <span className="text-4xl">👋</span>
                      </div>
                      <h3 className="text-xl font-bold text-foreground">Olá, {user?.name?.split(' ')[0]}!</h3>
                      <p className="text-muted-foreground max-w-md">
                        Como você já é nosso aluno, basta clicar abaixo para registrar seu interesse neste curso. 
                        Nossa equipe entrará em contato com você.
                      </p>
                      <Button 
                        onClick={() => handleSubmitInterest({ preventDefault: () => {} } as any)} 
                        disabled={isSubmitting || submitSuccess}
                        className="bg-primary hover:bg-blue-700 text-white rounded-full px-8 py-6 text-lg shadow-lg hover:shadow-xl transition-all mt-4 w-full sm:w-auto"
                      >
                        {isSubmitting ? 'Registrando...' : 'Tenho interesse neste curso'}
                      </Button>
                    </div>
                  ) : (
                    <form className="grid grid-cols-1 md:grid-cols-2 gap-4" onSubmit={handleSubmitInterest}>
                      <input
                        className="rounded-md border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-2.5 outline-none focus:ring-2 focus:ring-primary/50 transition-all dark:text-white"
                        placeholder="Nome completo"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        required
                      />
                      <input
                        className="rounded-md border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-2.5 outline-none focus:ring-2 focus:ring-primary/50 transition-all dark:text-white"
                        placeholder="Email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        onBlur={handleEmailBlur}
                        required
                      />
                      <input
                        className="rounded-md border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-2.5 outline-none focus:ring-2 focus:ring-primary/50 transition-all dark:text-white"
                        placeholder="Telefone/WhatsApp"
                        value={phone}
                        onChange={(e) => setPhone(phoneApplyMask(e.target.value))}
                      />
                      <input
                        className="rounded-md border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-2.5 outline-none focus:ring-2 focus:ring-primary/50 transition-all dark:text-white"
                        placeholder="Cidade/Estado"
                        value={cityState}
                        onChange={(e) => setCityState(e.target.value)}
                      />
                      {/* Mensagem oculta conforme solicitação */}
                      <div className="md:col-span-2 hidden">
                        <textarea className="w-full rounded-md border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-2.5" rows={4} placeholder="Mensagem" />
                      </div>
                      
                      <div className="md:col-span-2 flex flex-col items-center gap-4 mt-2">
                        <div className="w-full flex justify-end">
                          <Button type="submit" className="bg-primary hover:bg-blue-700 text-white rounded-md px-8 shadow-md hover:shadow-lg transition-all" disabled={isSubmitting}>
                            {isSubmitting ? 'Enviando...' : 'Enviar interesse'}
                          </Button>
                        </div>
                      </div>
                      {/* Honeypot Field (Hidden from humans) */}
                      <div style={{ display: 'none' }} aria-hidden="true">
                        <input
                          type="text"
                          name={HONEYPOT_FIELD}
                          tabIndex={-1}
                          autoComplete="off"
                        />
                      </div>
                    </form>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Right: cover and price box */}
            <div className="lg:col-span-1 space-y-6">
              <div className="sticky top-24 space-y-6">
                <Card className="border-0 shadow-2xl overflow-hidden rounded-2xl bg-white dark:bg-slate-900 h-auto">
                    {coverUrl ? (
                        <div className="relative">
                            <img src={coverUrl} alt={title} className="w-full h-auto object-cover aspect-video" />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
                        </div>
                    ) : (
                        <div className="bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-900 aspect-video flex items-center justify-center text-slate-400">
                            <span className="text-4xl">🎓</span>
                        </div>
                    )}
                </Card>

                <Card className="border border-slate-200/50 dark:border-white/5 shadow-2xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-md rounded-2xl overflow-hidden relative">
                    <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-primary to-secondary" />
                    <CardContent className="p-6">
                    <div className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-1">Preço do curso</div>
                    <div className="text-4xl font-extrabold text-primary dark:text-blue-400 mt-1 mb-4 flex items-baseline gap-1">
                         <span className="text-lg font-normal text-muted-foreground">R$</span>
                        {priceBox.valor || 'Consultar'}
                    </div>
                    
                    <Separator className="my-4 bg-slate-100 dark:bg-slate-800" />
                    
                    <div className="space-y-3 text-sm text-slate-600 dark:text-slate-300">
                        {priceBox.parcelas && priceBox.valorParcela ? (
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-primary/10 dark:bg-primary/20 flex items-center justify-center text-primary">💳</div>
                            <div>
                                Até <span className="font-bold ml-0.5">{priceBox.parcelas}x</span> de <span className="font-bold ml-0.5">R$ {priceBox.valorParcela}</span>
                            </div>
                        </div>
                        ) : (
                        <div className="flex items-center gap-2">
                             <div className="w-8 h-8 rounded-full bg-slate-50 dark:bg-slate-800 flex items-center justify-center">💬</div>
                            <span>Entre em contato para condições</span>
                        </div>
                        )}
                         <div className="flex items-center gap-2">
                             <div className="w-8 h-8 rounded-full bg-emerald-50 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600">🔒</div>
                             <span>Pagamento 100% seguro</span>
                        </div>
                    </div>

                    <div className="mt-6 flex flex-col gap-3">
                        {isAlreadyEnrolled ? (
                        <>
                            <Button disabled className="w-full bg-slate-100 text-slate-400 border-0 rounded-md" variant="outline">
                                ✅ Você já está matriculado
                            </Button>
                            <Button onClick={() => navigate(`/aluno/cursos/${String(id)}`)} className="w-full bg-primary hover:bg-primary/90 text-primary-foreground shadow-md rounded-md">
                                Acessar Curso
                            </Button>
                        </>
                        ) : (
                        <Button onClick={handleBuy} className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold h-12 shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all rounded-md">
                            Comprar agora
                        </Button>
                        )}
                         <p className="text-xs text-center text-muted-foreground mt-2">
                            Acesso imediato após confirmação
                        </p>
                    </div>
                    </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </div>
        <ValidationConflictModal
          open={conflictModalOpen}
          onOpenChange={setConflictModalOpen}
          conflictType={conflictType}
          onRetry={() => {
             const targetId = conflictType === 'email' ? 'email' : 'phone'; // simple logic
             // For guest form fields
             const inputs = document.querySelectorAll('input');
             // Email is usually 2nd input, but let's rely on user click
             // A better way would be refs, but for now scrolling to form top works
             const form = document.querySelector('form');
             if(form) form.scrollIntoView({ behavior: 'smooth', block: 'center'});
             // Try to focus email input by placeholder or type
             const emailInput = document.querySelector('input[type="email"]') as HTMLElement;
             if(emailInput) setTimeout(() => emailInput.focus(), 150);
          }}
        />

        {courseNumericId && (
          <div className="container mx-auto px-4 mt-12 mb-12">
            <PublicCourseComments courseId={courseNumericId} />
          </div>
        )}
      </section>
    </InclusiveSiteLayout>
  );
}
