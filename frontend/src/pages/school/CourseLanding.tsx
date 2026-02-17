import { useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { publicCoursesService } from '@/services/publicCoursesService';
import InclusiveSiteLayout from '@/components/layout/InclusiveSiteLayout';
import { PublicCourseComments } from '@/components/school/PublicCourseComments';

/**
 * CourseLanding
 * pt-BR: Página pública de apresentação do curso (landing). Exibe título, descrição,
 *        highlights e botão de compra/matrícula. Consome GET `/courses/:id`.
 * en-US: Public landing page for course presentation. Shows title, description,
 *        highlights, and a purchase/enroll button. Consumes GET `/courses/:id`.
 */
/**
 * CourseLanding
 * pt-BR: Página pública do curso. Renderiza descrição com suporte a HTML
 *        e mostra características principais do curso.
 * en-US: Public course page. Renders HTML-supported description
 *        and displays key course characteristics.
 */
export default function CourseLanding() {
  /**
   * Route params
   * pt-BR: Slug do curso obtido da URL.
   * en-US: Course slug obtained from URL.
   */
  const { slug } = useParams();
  const navigate = useNavigate();

  const { data: course, isLoading, error } = useQuery({
    queryKey: ['cursos', 'landing', slug],
    queryFn: async () => (slug ? publicCoursesService.getBySlug(String(slug)) : null),
    enabled: !!slug,
  });

  const title = useMemo(() => {
    const c: any = course || {};
    return c?.titulo || c?.nome || c?.title || (slug ? `Curso ${slug}` : 'Curso');
  }, [course, slug]);

  /**
   * description
   * pt-BR: Descrição do curso (HTML permitido). Usa alias `descricao` com
   *        fallback para `descricao_curso`.
   * en-US: Course description (HTML allowed). Uses `descricao` alias with
   *        fallback to `descricao_curso`.
   */
  const description = useMemo(() => {
    const c: any = course || {};
    return c?.descricao || c?.descricao_curso || c?.description || '';
  }, [course]);

  /**
   * coverUrl
   * pt-BR: URL da capa do curso, lendo exclusivamente de `config.cover.url`.
   * en-US: Course cover URL, reading exclusively from `config.cover.url`.
   */
  const coverUrl = useMemo(() => {
    const c: any = course || {};
    return String(c?.config?.cover?.url || '').trim();
  }, [course]);

  const highlights: string[] = useMemo(() => {
    const c: any = course || {};
    const pagina = c?.pagina_venda || {};
    const arr = pagina?.destaques || pagina?.highlights || [];
    return Array.isArray(arr) ? arr : [];
  }, [course]);

  /**
   * characteristics
   * pt-BR: Características exibidas no layout público (imagem 2):
   *        duração, instrutor, categoria, tipo, preço, parcelamento, aeronaves e gratuito.
   * en-US: Characteristics for the public layout (image 2):
   *        duration, instructor, category, type, price, installments, aircrafts and free flag.
   */
  const characteristics: { label: string; value: string }[] = useMemo(() => {
    const c: any = course || {};
    const duracao = c?.duracao ? String(c.duracao) : '';
    const unidade = c?.unidade_duracao || '';
    const instrutor = c?.instrutor || '';
    const categoria = c?.categoria || '';
    const tipo = c?.tipo || '';
    const valor = c?.valor || '';
    const parcelas = c?.parcelas || '';
    const valorParcela = c?.valor_parcela || '';
    const gratis = (c?.config?.gratis || c?.config?.adc?.recorrente || '') as string;

    const durationLabel = duracao ? `${duracao} ${unidade || ''}`.trim() : '';
    const priceLabel = valor ? `R$ ${valor}` : '';
    const installmentsLabel = parcelas
      ? `${parcelas}x${valorParcela ? ` de R$ ${valorParcela}` : ''}`.trim()
      : '';
    const aeronavesCount = Array.isArray(c?.aeronaves) ? c.aeronaves.length : 0;

    const list = [
      instrutor ? { label: 'Instrutor', value: instrutor } : null,
      durationLabel ? { label: 'Duração', value: durationLabel } : null,
      categoria ? { label: 'Categoria', value: String(categoria) } : null,
      tipo ? { label: 'Tipo', value: String(tipo) } : null,
      priceLabel ? { label: 'Valor', value: priceLabel } : null,
      installmentsLabel ? { label: 'Parcelamento', value: installmentsLabel } : null,
      aeronavesCount ? { label: 'Aeronaves', value: `${aeronavesCount}` } : null,
      (String(gratis).toLowerCase() === 's' || String(gratis).toLowerCase() === 'y')
        ? { label: 'Disponibilidade', value: 'Gratuito' }
        : null,
    ].filter(Boolean) as { label: string; value: string }[];

    return list;
  }, [course]);

  /**
   * handleEnroll
   * pt-BR: Redireciona para criação de proposta/matrícula, usando `course.id` quando disponível.
   * en-US: Redirects to proposal/enrollment creation, using `course.id` when available.
   */
  const handleEnroll = () => {
    // pt-BR: Redireciona para criação de proposta/matrícula, pré-selecionando curso.
    // en-US: Redirects to proposal/enrollment creation, pre-selecting course.
    const q = new URLSearchParams({ courseId: String((course as any)?.id || '') }).toString();
    navigate(`/admin/sales/proposals/create?${q}`);
  };

  return (
    <InclusiveSiteLayout>
      <div className="container mx-auto p-4 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="line-clamp-2 break-words">{isLoading ? 'Carregando...' : title}</CardTitle>
            <CardDescription>Apresentação do curso</CardDescription>
          </CardHeader>
          <CardContent>
            {error && (
              <div className="text-red-600 mb-4">Falha ao carregar o curso.</div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="md:col-span-2 space-y-3">
                {isLoading ? (
                  <p className="text-muted-foreground">—</p>
                ) : description ? (
                  <div
                    className="prose prose-sm max-w-none text-muted-foreground"
                    dangerouslySetInnerHTML={{ __html: description }}
                  />
                ) : (
                  <p className="text-muted-foreground">Sem descrição disponível.</p>
                )}
                {characteristics.length > 0 && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
                    {characteristics.map((c, i) => (
                      <div key={i} className="p-3 border rounded-md bg-muted/30">
                        <div className="text-xs text-muted-foreground">{c.label}</div>
                        <div className="font-medium">{c.value}</div>
                      </div>
                    ))}
                  </div>
                )}
                {highlights.length > 0 && (
                  <ul className="list-disc ml-6">
                    {highlights.map((h, i) => (
                      <li key={i}>{h}</li>
                    ))}
                  </ul>
                )}
                <div className="pt-4">
                  <Button onClick={handleEnroll} disabled={isLoading || !!error}>
                    Quero me matricular
                  </Button>
                </div>
              </div>
              <div className="md:col-span-1">
                {coverUrl ? (
                  <img src={coverUrl} alt={title} className="rounded-md w-full h-auto object-cover" />
                ) : (
                  <div className="bg-muted h-40 rounded-md flex items-center justify-center">Sem imagem</div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {(course as any)?.id && (
          <div className="mt-8">
            <PublicCourseComments courseId={(course as any).id} />
          </div>
        )}
      </div>
    </InclusiveSiteLayout>
  );
}