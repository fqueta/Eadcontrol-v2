import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { InputMask, format as formatMask } from '@react-input/mask';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Combobox } from '@/components/ui/combobox';
import { UserPlus, Loader2, BookOpen, Users, User, Phone, Mail, FileText, CheckCircle2 } from 'lucide-react';
import { clientsService } from '@/services/clientsService';
import { enrollmentsService } from '@/services/enrollmentsService';
import { coursesService } from '@/services/coursesService';
import { turmasService } from '@/services/turmasService';
import { CourseRecord } from '@/types/courses';
import { TurmaRecord } from '@/types/turmas';

interface QuickClientDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: (result: { clientId: string; enrollmentId?: string }) => void;
  /** Se true, não redireciona automaticamente ao salvar */
  preventRedirect?: boolean;
}

/**
 * QuickClientDialog — Modal de Cadastro Rápido de Cliente e Interessado (Lead).
 * pt-BR: Permite criar cliente rapidamente com Nome (obrigatório), dados opcionais de contato e CPF,
 *        além de vincular diretamente um Curso/Turma de interesse em formato Combobox filtrável.
 */
export default function QuickClientDialog({
  open,
  onOpenChange,
  onSuccess,
  preventRedirect = false,
}: QuickClientDialogProps) {
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [cpf, setCpf] = useState('');
  const [courseId, setCourseId] = useState('');
  const [turmaId, setTurmaId] = useState('');

  const [courses, setCourses] = useState<CourseRecord[]>([]);
  const [turmas, setTurmas] = useState<TurmaRecord[]>([]);
  const [isLoadingCourses, setIsLoadingCourses] = useState(false);
  const [isLoadingTurmas, setIsLoadingTurmas] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Carrega cursos ativos ao abrir o modal
  useEffect(() => {
    if (!open) return;
    let isCancelled = false;
    setIsLoadingCourses(true);

    coursesService
      .listCourses({ per_page: 200 } as any)
      .then((res: any) => {
        if (!isCancelled) {
          const items = res?.data || (Array.isArray(res) ? res : []);
          setCourses(items);
        }
      })
      .catch(() => {
        // Falha silenciosa
      })
      .finally(() => {
        if (!isCancelled) setIsLoadingCourses(false);
      });

    return () => {
      isCancelled = true;
    };
  }, [open]);

  // Carrega turmas filtrando por id_curso ao selecionar um curso
  useEffect(() => {
    if (!courseId || courseId === 'none') {
      setTurmas([]);
      setTurmaId('');
      return;
    }

    let isCancelled = false;
    setIsLoadingTurmas(true);

    turmasService
      .listTurmas({ id_curso: courseId, per_page: 200 } as any)
      .then((res: any) => {
        if (!isCancelled) {
          const items = res?.data || res?.items || (Array.isArray(res) ? res : []);
          // Garante a filtragem das turmas pelo curso selecionado
          const filtered = items.filter(
            (t: any) =>
              String(t.id_curso || t.curso_id || t.course_id || '') === String(courseId)
          );
          setTurmas(filtered.length > 0 ? filtered : items);
        }
      })
      .catch(() => {
        if (!isCancelled) setTurmas([]);
      })
      .finally(() => {
        if (!isCancelled) setIsLoadingTurmas(false);
      });

    return () => {
      isCancelled = true;
    };
  }, [courseId]);

  // Mapeia cursos para o formato de opções do Combobox
  const courseOptions = useMemo(() => {
    const opts = courses.map((c: any) => ({
      value: String(c.id),
      label: c.nome || c.name || c.titulo || `Curso #${c.id}`,
      description: c.categoria ? String(c.categoria) : undefined,
    }));
    return [{ value: 'none', label: 'Nenhum curso selecionado' }, ...opts];
  }, [courses]);

  // Mapeia turmas para o formato de opções do Combobox
  const turmaOptions = useMemo(() => {
    const opts = turmas.map((t: any) => ({
      value: String(t.id),
      label: t.nome || t.name || t.descricao || t.token || `Turma #${t.id}`,
      description: t.inicio ? `Início: ${t.inicio}` : undefined,
    }));
    return [{ value: 'none', label: 'Qualquer turma / Sem turma definida' }, ...opts];
  }, [turmas]);

  // Reseta os campos ao fechar
  const handleOpenChange = (val: boolean) => {
    if (!val) {
      setName('');
      setPhone('');
      setEmail('');
      setCpf('');
      setCourseId('');
      setTurmaId('');
    }
    onOpenChange(val);
  };

  const cleanPhone = useMemo(() => phone.replace(/\D/g, ''), [phone]);
  const cleanCpf = useMemo(() => cpf.replace(/\D/g, ''), [cpf]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      toast.error('Informe o nome do cliente.');
      return;
    }

    try {
      setIsSubmitting(true);

      // 1. Cria o Cliente
      const clientPayload: any = {
        name: name.trim(),
        email: email.trim() || undefined,
        cpf: cleanCpf || undefined,
        telefone: cleanPhone || undefined,
        tipo_pessoa: 'pf',
        genero: 'ni',
        status: 'pre_registred',
        config: {
          celular: cleanPhone || '',
        },
      };

      const createdClient = await clientsService.createClient(clientPayload);
      const createdClientId = String(createdClient.id);

      let createdEnrollmentId: string | undefined = undefined;

      // 2. Se houver Curso de Interesse selecionado, gera a Matrícula (Lead no Funil de Vendas)
      if (courseId && courseId !== 'none') {
        const selectedCourse = courses.find((c: any) => String(c.id) === String(courseId));
        const courseName = (selectedCourse as any)?.nome || (selectedCourse as any)?.name || 'Curso';

        const enrollmentPayload: any = {
          name: `Interesse - ${courseName}`,
          student_id: createdClientId,
          id_cliente: createdClientId,
          course_id: String(courseId),
          id_curso: String(courseId),
          id_turma: turmaId && turmaId !== 'none' ? Number(turmaId) : 0,
          turma_id: turmaId && turmaId !== 'none' ? String(turmaId) : '0',
        };

        const createdEnrollment = await enrollmentsService.createEnrollment(enrollmentPayload);
        const rawId = (createdEnrollment as any)?.id ?? (createdEnrollment as any)?.ID;
        createdEnrollmentId = rawId !== undefined && rawId !== null ? String(rawId) : undefined;
      }

      // Feedback de Sucesso
      if (createdEnrollmentId) {
        toast.success(`Cliente "${name.trim()}" cadastrado com interesse gerado!`);
      } else {
        toast.success(`Cliente "${name.trim()}" cadastrado com sucesso!`);
      }

      handleOpenChange(false);

      if (onSuccess) {
        onSuccess({ clientId: createdClientId, enrollmentId: createdEnrollmentId });
      }

      // Redirecionamento inteligente
      if (!preventRedirect) {
        if (createdEnrollmentId) {
          navigate(`/admin/school/enrollments/view/${createdEnrollmentId}`);
        } else {
          navigate(`/admin/clients/${createdClientId}/view`);
        }
      }
    } catch (err: any) {
      const resData = err?.response?.data || err?.body;
      let msg = resData?.message || err?.message || 'Erro ao cadastrar cliente.';

      if (resData?.errors && typeof resData.errors === 'object') {
        const firstErrorKey = Object.keys(resData.errors)[0];
        if (firstErrorKey && Array.isArray(resData.errors[firstErrorKey]) && resData.errors[firstErrorKey][0]) {
          msg = resData.errors[firstErrorKey][0];
        }
      }

      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg font-bold">
            <UserPlus className="h-5 w-5 text-primary" />
            Novo Cliente / Lead Rápido
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Cadastre rapidamente o contato e vincule um curso de interesse para inseri-lo no funil comercial.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-1">
          {/* Nome Completo (Obrigatório) */}
          <div className="space-y-1">
            <Label className="text-xs font-semibold">Nome Completo *</Label>
            <div className="relative">
              <User className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex.: Maria de Souza"
                className="pl-9 rounded-xl text-sm"
                required
                autoFocus
              />
            </div>
          </div>

          {/* Telefone e E-mail (Opcionais) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">WhatsApp / Celular</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground z-10" />
                <InputMask
                  component="input"
                  mask="(__) _____-____"
                  replacement={{ _: /\d/ }}
                  value={
                    phone ? formatMask(phone, { mask: '(__) _____-____', replacement: { _: /\d/ } }) : ''
                  }
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="(00) 00000-0000"
                  className="flex h-10 w-full rounded-xl border border-input bg-background pl-9 pr-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">E-mail</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="cliente@email.com"
                  className="pl-9 rounded-xl text-sm"
                />
              </div>
            </div>
          </div>

          {/* CPF (Opcional) */}
          <div className="space-y-1">
            <Label className="text-xs">CPF (Opcional)</Label>
            <div className="relative">
              <FileText className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground z-10" />
              <InputMask
                component="input"
                mask="___.___.___-__"
                replacement={{ _: /\d/ }}
                value={
                  cpf ? formatMask(cpf, { mask: '___.___.___-__', replacement: { _: /\d/ } }) : ''
                }
                onChange={(e) => setCpf(e.target.value)}
                placeholder="000.000.000-00"
                className="flex h-10 w-full rounded-xl border border-input bg-background pl-9 pr-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              />
            </div>
          </div>

          {/* Divisória com destaque para Interesse */}
          <div className="relative my-2">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-dashed" />
            </div>
            <div className="relative flex justify-center text-[10px] uppercase font-bold tracking-wider">
              <span className="bg-background px-2 text-primary flex items-center gap-1">
                <BookOpen className="h-3 w-3" /> Interesse Comercial
              </span>
            </div>
          </div>

          {/* Curso de Interesse com Combobox Filtrável */}
          <div className="space-y-1">
            <Label className="text-xs font-medium">Curso de Interesse</Label>
            <Combobox
              options={courseOptions}
              value={courseId || 'none'}
              onValueChange={(val) => {
                setCourseId(val === 'none' ? '' : val);
                setTurmaId('');
              }}
              placeholder={isLoadingCourses ? 'Carregando cursos...' : 'Selecione ou busque um curso...'}
              searchPlaceholder="Digite para filtrar o curso..."
              emptyText="Nenhum curso encontrado com esse nome."
              disabled={isLoadingCourses}
              className="w-full rounded-xl text-sm"
            />
          </div>

          {/* Turma de Interesse com Combobox (Apenas se houver curso selecionado) */}
          {courseId && courseId !== 'none' && (
            <div className="space-y-1 animate-in fade-in-50 duration-200">
              <Label className="text-xs font-medium flex items-center gap-1">
                <Users className="h-3 w-3 text-muted-foreground" />
                Turma de Interesse
              </Label>
              <Combobox
                options={turmaOptions}
                value={turmaId || 'none'}
                onValueChange={(val) => setTurmaId(val === 'none' ? '' : val)}
                placeholder={
                  isLoadingTurmas
                    ? 'Carregando turmas...'
                    : turmas.length === 0
                    ? 'Nenhuma turma cadastrada para este curso'
                    : 'Selecione ou busque uma turma...'
                }
                searchPlaceholder="Digite para filtrar a turma..."
                emptyText="Nenhuma turma encontrada."
                disabled={isLoadingTurmas}
                className="w-full rounded-xl text-sm"
              />
            </div>
          )}

          {/* Botões de Ação */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={isSubmitting}
              className="rounded-xl"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || !name.trim()}
              className="rounded-xl font-semibold gap-1.5 shadow-sm"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Salvando...
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4" />
                  Salvar Cliente
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
