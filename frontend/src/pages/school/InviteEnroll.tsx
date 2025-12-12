import React, { useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import InclusiveSiteLayout from '@/components/layout/InclusiveSiteLayout';
import { publicCoursesService } from '@/services/publicCoursesService';
import { publicEnrollmentService } from '@/services/publicEnrollmentService';
import { useToast } from '@/hooks/use-toast';

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
  const { id: idOrSlug } = useParams();
  const navigate = useNavigate();
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

  const courseId = useMemo(() => Number((course as any)?.id || 0), [course]);
  const courseSlug = useMemo(() => String((course as any)?.slug || (course as any)?.token || idOrSlug || ''), [course, idOrSlug]);
  const courseTitle = useMemo(() => String(((course as any)?.titulo || (course as any)?.nome || 'Curso')), [course]);

  // Form state
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [privacyAccepted, setPrivacyAccepted] = useState<boolean>(true);
  const [termsAccepted, setTermsAccepted] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState(false);

  /**
   * canSubmit
   * pt-BR: Habilita o envio quando campos obrigatórios estão preenchidos.
   * en-US: Enables submit when required fields are filled.
   */
  const canSubmit = useMemo(() => {
    return !!name && !!email && !!password && courseId > 0 && privacyAccepted && termsAccepted;
  }, [name, email, password, courseId, privacyAccepted, termsAccepted]);

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
    setSubmitting(true);
    try {
      const resp = await publicEnrollmentService.registerAndEnroll({
        name,
        email,
        password,
        phone,
        id_curso: courseId,
        privacyAccepted,
        termsAccepted,
      });
      toast({
        title: 'Cadastro realizado',
        description: 'Enviamos um e-mail de boas-vindas com o link do curso.',
      });
      // Opcional: navegar para a página do aluno (exige login)
      // navigate(`/aluno/cursos/${courseSlug}`);
    } catch (err: any) {
      const message = err?.message || 'Falha ao realizar cadastro';
      toast({ title: 'Erro', description: message, variant: 'destructive' });
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
              {isLoading ? 'Carregando curso…' : error ? 'Erro ao carregar o curso' : `Inscreva-se em: ${courseTitle}`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form className="grid grid-cols-1 md:grid-cols-2 gap-4" onSubmit={handleSubmit}>
              <div className="space-y-2 md:col-span-2">
                <Label>Nome completo</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Seu nome" required />
              </div>
              <div className="space-y-2">
                <Label>Telefone</Label>
                <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="(DDD) 99999-9999" />
              </div>
              <div className="space-y-2">
                <Label>E-mail</Label>
                <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="seu@email.com" required />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>Senha</Label>
                <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Crie uma senha" required />
              </div>
              <div className="flex items-center space-x-2 md:col-span-2">
                <Checkbox id="privacy" checked={privacyAccepted} onCheckedChange={(v) => setPrivacyAccepted(!!v)} />
                <Label htmlFor="privacy">Aceito a política de privacidade</Label>
              </div>
              <div className="flex items-center space-x-2 md:col-span-2">
                <Checkbox id="terms" checked={termsAccepted} onCheckedChange={(v) => setTermsAccepted(!!v)} />
                <Label htmlFor="terms">Aceito os termos de uso</Label>
              </div>

              <div className="md:col-span-2 flex items-center gap-2">
                <Button type="submit" disabled={!canSubmit || submitting}>
                  {submitting ? 'Enviando…' : 'Confirmar matrícula'}
                </Button>
                <Button type="button" variant="outline" onClick={() => navigate(`/aluno/cursos/${courseSlug}`)}>
                  Ir para o curso
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </InclusiveSiteLayout>
  );
}