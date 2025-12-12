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
      <section className="py-10">
        <div className="container mx-auto">
          {/* Header area */}
          {/**
           * Header
           * pt-BR: Usa as mesmas cores do layout (gradiente violeta/fúcsia) e mantém a identidade visual com a logo via InclusiveSiteLayout.
           * en-US: Uses the same layout colors (violet/fuchsia gradient) and keeps visual identity with the logo via InclusiveSiteLayout.
           */}
          <div className="relative overflow-hidden rounded-t bg-gradient-to-r from-violet-700 via-violet-600 to-fuchsia-600 text-white px-6 py-8">
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">{title}</h1>
            {error && (
              <p className="mt-2 text-sm text-white/90">Falha ao carregar informações do curso.</p>
            )}
          </div>

          {/* Main grid */}
          <div className="grid md:grid-cols-3 gap-6 bg-white rounded-b p-6 shadow-sm">
            {/* Left: description and highlights */}
            <div className="md:col-span-2 space-y-6">
              <Card className="border-violet-200">
                <CardHeader>
                  <CardTitle className="text-violet-800">Por que realizar este curso?</CardTitle>
                  <CardDescription>
                    Confira os benefícios e o conteúdo programático.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {description && renderDescriptionHtml(description)}
                  {highlights.length > 0 && (
                    <div>
                      <h3 className="text-sm font-medium mb-2">Destaques</h3>
                      <ul className="list-disc ml-6 space-y-1">
                        {highlights.map((h, i) => (
                          <li key={i}>{h}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>O que você vai aprender?</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {modules.length === 0 && (
                    <p className="text-sm text-muted-foreground">Conteúdo do curso será exibido aqui.</p>
                  )}
                  {modules.map((m: any, idx: number) => (
                    <div key={idx} className="rounded-md border p-3">
                      <div className="font-medium">{m?.titulo || `Módulo ${idx + 1}`}</div>
                      {Array.isArray(m?.atividades) && m.atividades.length > 0 && (
                        <ul className="mt-2 list-disc ml-5 space-y-1">
                          {m.atividades.map((a: any, j: number) => (
                            <li key={j}>{a?.titulo || a?.name || `Aula ${j + 1}`}</li>
                          ))}
                        </ul>
                      )}
                    </div>
                  ))}
                </CardContent>
              </Card>

              <div className="rounded-md bg-violet-700 text-white p-4">
                <div className="font-semibold">Facilidades de pagamento</div>
                <p className="text-sm text-white/90 mt-1">
                  Parcelamento e condições especiais podem ser aplicadas de acordo com a política da escola.
                </p>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Interessados e contato</CardTitle>
                  <CardDescription>Preencha seus dados para receber mais informações</CardDescription>
                </CardHeader>
                <CardContent>
                  {submitSuccess && successMessage && (
                    <div className="mb-3 rounded-md border border-emerald-200 bg-emerald-50 text-emerald-700 p-2 text-sm">
                      {successMessage}
                    </div>
                  )}
                  {/**
                   * Contact form
                   * pt-BR: Campo de mensagem oculto conforme solicitado; envia interesse criando matrícula.
                   * en-US: Message field hidden as requested; submits interest by creating enrollment.
                   */}
                  <form className="grid grid-cols-1 md:grid-cols-2 gap-3" onSubmit={handleSubmitInterest}>
                    <input
                      className="rounded-md border p-2"
                      placeholder="Nome completo"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                    />
                    <input
                      className="rounded-md border p-2"
                      placeholder="Email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                    <input
                      className="rounded-md border p-2"
                      placeholder="Telefone/WhatsApp"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                    />
                    <input
                      className="rounded-md border p-2"
                      placeholder="Cidade/Estado"
                      value={cityState}
                      onChange={(e) => setCityState(e.target.value)}
                    />
                    {/* Mensagem oculta conforme solicitação */}
                    <div className="md:col-span-2 hidden">
                      <textarea className="w-full rounded-md border p-2" rows={4} placeholder="Mensagem" />
                    </div>
                    <div className="md:col-span-2 flex justify-end">
                      <Button type="submit" className="bg-violet-700 hover:bg-violet-800" disabled={isSubmitting}>
                        {isSubmitting ? 'Enviando...' : 'Enviar'}
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            </div>

            {/* Right: cover and price box */}
            <div className="md:col-span-1 space-y-4">
              <Card>
                <CardContent className="p-2">
                  {coverUrl ? (
                    <img src={coverUrl} alt={title} className="rounded-md w-full h-auto object-cover" />
                  ) : (
                    <div className="bg-muted h-48 rounded-md flex items-center justify-center">Sem imagem</div>
                  )}
                </CardContent>
              </Card>

              <Card className="border-violet-300">
                <CardContent className="p-4">
                  <div className="text-sm text-muted-foreground">Preço</div>
                  <div className="text-3xl font-bold text-violet-700 mt-1">
                    {priceBox.valor ? `R$ ${priceBox.valor}` : 'Consultar'}
                  </div>
                  <Separator className="my-3" />
                  <div className="space-y-1 text-sm">
                    {priceBox.parcelas && priceBox.valorParcela ? (
                      <div>ou até <span className="font-semibold">{priceBox.parcelas}x</span> de <span className="font-semibold">R$ {priceBox.valorParcela}</span></div>
                    ) : (
                      <div>Entre em contato para condições de pagamento</div>
                    )}
                  </div>
                  <div className="mt-3 flex gap-2">
                    {isAlreadyEnrolled ? (
                      <>
                        <Button disabled className="w-full" title="Já matriculado">Já matriculado</Button>
                        <Button variant="outline" onClick={() => navigate(`/aluno/cursos/${String(id)}`)} className="w-full">Ir para o curso</Button>
                      </>
                    ) : (
                      <Button onClick={handleBuy} className="w-full bg-violet-700 hover:bg-violet-800">Comprar agora</Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>
    </InclusiveSiteLayout>
  );
}