import { useMemo, useState } from 'react';
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
import { useEnrollmentsList } from '@/hooks/enrollments';

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
      toast.error('Você já está matriculado neste curso.');
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

      if (!fullName || !email) {
        toast.error('Informe nome e e-mail para prosseguir.');
        return;
      }

      // Registra interesse via endpoint público sem autenticação
      await publicEnrollmentService.registerInterest({
        name: `Interesse • ${fullName}`,
        email,
        phone,
        id_curso: courseId ? Number(courseId) : undefined,
        id_turma: 0,
      });

      // Envia e-mail de boas-vindas via backend (Brevo); fallback para mailto em caso de falha
      try {
        await emailsService.sendWelcome({
          name: fullName,
          email,
          course_id: courseId ? Number(courseId) : undefined,
          course_title: String(c?.titulo || title),
        });
        toast.success('Interesse enviado! Matrícula criada e email de boas-vindas disparado.');
        setSubmitSuccess(true);
        setSuccessMessage('Interesse enviado! Em breve entraremos em contato por e-mail.');
        resetInterestFormFields();
      } catch (sendErr) {
        console.warn('Falha ao enviar email via backend, usando mailto fallback:', sendErr);
        const subject = encodeURIComponent(`Bem-vindo ao curso ${String(c?.titulo || title)}`);
        const body = encodeURIComponent(
          `Olá ${fullName},\n\n` +
          `Obrigado pelo seu interesse no curso "${String(c?.titulo || title)}". ` +
          `Nossa equipe entrará em contato com você em breve com mais detalhes.\n\n` +
          `Informações fornecidas:\n` +
          `• E-mail: ${email}\n` +
          `• Telefone/WhatsApp: ${phone || '—'}\n` +
          `• Cidade/Estado: ${cityState || '—'}\n\n` +
          `Atenciosamente,\nEquipe Incluir & Educar`
        );
        window.open(`mailto:${email}?subject=${subject}&body=${body}`, '_blank');
        toast.success('Interesse enviado! Matrícula criada. Email fallback aberto.');
        setSubmitSuccess(true);
        setSuccessMessage('Interesse enviado! Abrimos seu e-mail para confirmar o contato.');
        resetInterestFormFields();
      }
      // Optional: direct to purchase flow if exists
      // handleBuy();
    } catch (err: any) {
      console.error('Erro ao enviar interesse:', err);
      toast.error('Falha ao enviar interesse. Tente novamente.');
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
           * pt-BR: Usa as mesmas cores do layout (gradiente violeta/fúcsia) e mantém a identidade visual com a logo via InclusiveSiteLayout.
           * en-US: Uses the same layout colors (violet/fuchsia gradient) and keeps visual identity with the logo via InclusiveSiteLayout.
           */}
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-violet-900 via-violet-800 to-fuchsia-900 text-white shadow-xl mb-8">
            <div className="absolute inset-0 opacity-10 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-white via-transparent to-transparent" />
            <div className="absolute -right-20 -top-20 h-96 w-96 rounded-full bg-violet-500/20 blur-3xl" />
            <div className="relative z-10 px-8 py-10 md:py-14">
              <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight mb-2 drop-shadow-md">{title}</h1>
              {error && (
                <p className="mt-2 text-sm text-white/90 bg-red-500/20 inline-block px-3 py-1 rounded-full">Falha ao carregar informações do curso.</p>
              )}
            </div>
          </div>

          {/* Main grid */}
          <div className="grid lg:grid-cols-3 gap-8">
            {/* Left: description and highlights */}
            <div className="lg:col-span-2 space-y-8">
              <Card className="border-0 shadow-lg bg-white dark:bg-slate-900 overflow-hidden ring-1 ring-slate-200 dark:ring-slate-800">
                <CardHeader className="bg-violet-50/50 dark:bg-violet-900/10 border-b border-violet-100 dark:border-violet-800/50 pb-6">
                  <CardTitle className="text-2xl text-violet-800 dark:text-violet-300 font-bold">Por que realizar este curso?</CardTitle>
                  <CardDescription className="text-base">
                    Confira os benefícios e o conteúdo programático detalhado.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6 pt-6">
                  {description && renderDescriptionHtml(description)}
                  {highlights.length > 0 && (
                    <div className="bg-violet-50 dark:bg-violet-900/20 p-5 rounded-xl border border-violet-100 dark:border-violet-800/50">
                      <h3 className="text-base font-semibold text-violet-900 dark:text-violet-300 mb-3 flex items-center gap-2">
                        <span className="text-xl">✨</span> Destaques
                      </h3>
                      <ul className="grid sm:grid-cols-2 gap-2 text-sm">
                        {highlights.map((h, i) => (
                          <li key={i} className="flex items-start gap-2">
                             <span className="text-violet-500 mt-1">•</span>
                             <span className="text-slate-700 dark:text-slate-300">{h}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className="border-0 shadow-md bg-white dark:bg-slate-900 ring-1 ring-slate-200 dark:ring-slate-800">
                <CardHeader className="pb-4">
                  <CardTitle className="text-xl">O que você vai aprender?</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {modules.length === 0 && (
                    <p className="text-sm text-muted-foreground italic">Conteúdo do curso será exibido aqui.</p>
                  )}
                  {modules.map((m: any, idx: number) => (
                    <div key={idx} className="rounded-xl border border-slate-200 dark:border-slate-800 p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                      <div className="font-semibold text-violet-900 dark:text-violet-300 mb-2">{m?.titulo || `Módulo ${idx + 1}`}</div>
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

              <div className="rounded-xl bg-gradient-to-r from-violet-700 to-fuchsia-700 text-white p-6 shadow-lg relative overflow-hidden">
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

              <Card className="border-0 shadow-md bg-white dark:bg-slate-900 ring-1 ring-slate-200 dark:ring-slate-800">
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
                  <form className="grid grid-cols-1 md:grid-cols-2 gap-4" onSubmit={handleSubmitInterest}>
                    <input
                      className="rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-2.5 outline-none focus:ring-2 focus:ring-violet-500/50 transition-all dark:text-white"
                      placeholder="Nome completo"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                    />
                    <input
                      className="rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-2.5 outline-none focus:ring-2 focus:ring-violet-500/50 transition-all dark:text-white"
                      placeholder="Email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                    <input
                      className="rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-2.5 outline-none focus:ring-2 focus:ring-violet-500/50 transition-all dark:text-white"
                      placeholder="Telefone/WhatsApp"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                    />
                    <input
                      className="rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-2.5 outline-none focus:ring-2 focus:ring-violet-500/50 transition-all dark:text-white"
                      placeholder="Cidade/Estado"
                      value={cityState}
                      onChange={(e) => setCityState(e.target.value)}
                    />
                    {/* Mensagem oculta conforme solicitação */}
                    <div className="md:col-span-2 hidden">
                      <textarea className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-2.5" rows={4} placeholder="Mensagem" />
                    </div>
                    <div className="md:col-span-2 flex justify-end mt-2">
                      <Button type="submit" className="bg-violet-700 hover:bg-violet-800 text-white rounded-full px-8 shadow-md hover:shadow-lg transition-all" disabled={isSubmitting}>
                        {isSubmitting ? 'Enviando...' : 'Enviar interesse'}
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            </div>

            {/* Right: cover and price box */}
            <div className="lg:col-span-1 space-y-6">
              <div className="sticky top-24 space-y-6">
                <Card className="border-0 shadow-xl overflow-hidden rounded-xl bg-white dark:bg-slate-900 h-auto">
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

                <Card className="border-2 border-violet-100 dark:border-violet-900 shadow-xl bg-white dark:bg-slate-900 rounded-xl overflow-hidden relative">
                    <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-violet-600 to-fuchsia-600" />
                    <CardContent className="p-6">
                    <div className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-1">Preço do curso</div>
                    <div className="text-4xl font-extrabold text-violet-700 dark:text-violet-400 mt-1 mb-4 flex items-baseline gap-1">
                         <span className="text-lg font-normal text-muted-foreground">R$</span>
                        {priceBox.valor || 'Consultar'}
                    </div>
                    
                    <Separator className="my-4 bg-slate-100 dark:bg-slate-800" />
                    
                    <div className="space-y-3 text-sm text-slate-600 dark:text-slate-300">
                        {priceBox.parcelas && priceBox.valorParcela ? (
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-violet-50 dark:bg-violet-900/30 flex items-center justify-center text-violet-600">💳</div>
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
                            <Button disabled className="w-full bg-slate-100 text-slate-400 border-0" variant="outline">
                                ✅ Você já está matriculado
                            </Button>
                            <Button onClick={() => navigate(`/aluno/cursos/${String(id)}`)} className="w-full bg-violet-600 hover:bg-violet-700 text-white shadow-md">
                                Acessar Curso
                            </Button>
                        </>
                        ) : (
                        <Button onClick={handleBuy} className="w-full bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-700 hover:to-fuchsia-700 text-white font-bold h-12 shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all rounded-lg">
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
      </section>
    </InclusiveSiteLayout>
  );
}