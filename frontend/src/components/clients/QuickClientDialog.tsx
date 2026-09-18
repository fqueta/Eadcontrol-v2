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
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  UserPlus,
  Loader2,
  BookOpen,
  Users,
  User,
  Phone,
  Mail,
  FileText,
  CheckCircle2,
  DollarSign,
  Calendar,
  CreditCard,
  Receipt,
  Sparkles,
} from 'lucide-react';
import { clientsService } from '@/services/clientsService';
import { enrollmentsService } from '@/services/enrollmentsService';
import { coursesService } from '@/services/coursesService';
import { turmasService } from '@/services/turmasService';
import { CourseRecord } from '@/types/courses';
import { TurmaRecord } from '@/types/turmas';
import { currencyRemoveMaskToNumber, currencyApplyMask } from '@/lib/masks/currency';

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

  // Estados para faturamento rápido no financeiro
  const [generateInvoices, setGenerateInvoices] = useState(false);
  const [separateEnrollmentFee, setSeparateEnrollmentFee] = useState(true);
  const [installments, setInstallments] = useState('1');
  const [firstDueDate, setFirstDueDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return d.toISOString().split('T')[0];
  });
  const [feeDueDate, setFeeDueDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 3);
    return d.toISOString().split('T')[0];
  });
  const [paymentMethod, setPaymentMethod] = useState('pix');

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

  // Curso selecionado atualmente
  const selectedCourse = useMemo(() => {
    if (!courseId || courseId === 'none') return null;
    return courses.find((c: any) => String(c.id) === String(courseId)) || null;
  }, [courses, courseId]);

  // Valores calculados do curso selecionado
  const coursePricing = useMemo(() => {
    if (!selectedCourse) return null;
    const rawVal = (selectedCourse as any)?.valor;
    const rawInsc = (selectedCourse as any)?.inscricao;

    const valNum = typeof rawVal === 'string' ? currencyRemoveMaskToNumber(rawVal) : Number(rawVal) || 0;
    const inscNum = typeof rawInsc === 'string' ? currencyRemoveMaskToNumber(rawInsc) : Number(rawInsc) || 0;
    const totalNum = valNum + inscNum;

    return {
      subtotal: valNum,
      inscricao: inscNum,
      total: totalNum,
      subtotalFormatted: currencyApplyMask(String(Math.round(valNum * 100))),
      inscricaoFormatted: currencyApplyMask(String(Math.round(inscNum * 100))),
      totalFormatted: currencyApplyMask(String(Math.round(totalNum * 100))),
    };
  }, [selectedCourse]);

  // Mapeia cursos para o formato de opções do Combobox
  const courseOptions = useMemo(() => {
    const opts = courses.map((c: any) => {
      const rawVal = c?.valor;
      const numVal = typeof rawVal === 'string' ? currencyRemoveMaskToNumber(rawVal) : Number(rawVal) || 0;
      const priceTag = numVal > 0 ? currencyApplyMask(String(Math.round(numVal * 100))) : '';
      const descParts = [c.categoria ? String(c.categoria) : '', priceTag].filter(Boolean);

      return {
        value: String(c.id),
        label: c.nome || c.name || c.titulo || `Curso #${c.id}`,
        description: descParts.length > 0 ? descParts.join(' • ') : undefined,
      };
    });
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
      setGenerateInvoices(false);
      setSeparateEnrollmentFee(true);
      setInstallments('1');
    }
    onOpenChange(val);
  };

  const cleanPhone = useMemo(() => phone.replace(/\D/g, ''), [phone]);
  const cleanCpf = useMemo(() => cpf.replace(/\D/g, ''), [cpf]);

  // Cálculo das faturas geradas (simulação para visualização e envio)
  const plannedInvoices = useMemo(() => {
    if (!generateInvoices || !coursePricing || coursePricing.total <= 0) {
      return [];
    }

    const inscNum = coursePricing.inscricao;
    const subNum = coursePricing.subtotal;
    const shouldSeparate = separateEnrollmentFee && inscNum > 0;
    const installmentTotal = shouldSeparate ? subNum : coursePricing.total;
    const qty = Math.max(1, Number(installments) || 1);
    const installmentValue = installmentTotal / qty;
    const courseName = (selectedCourse as any)?.nome || (selectedCourse as any)?.name || 'Curso';

    const invs: Array<{
      amount: number;
      due_date: string;
      payment_method: string;
      description: string;
      amountFormatted: string;
    }> = [];

    if (shouldSeparate) {
      invs.push({
        amount: Number(inscNum.toFixed(2)),
        due_date: feeDueDate || new Date().toISOString().split('T')[0],
        payment_method: paymentMethod,
        description: `Taxa de Matrícula - ${courseName}`,
        amountFormatted: currencyApplyMask(String(Math.round(inscNum * 100))),
      });
    }

    for (let i = 0; i < qty; i++) {
      const baseDate = firstDueDate ? new Date(`${firstDueDate}T12:00:00`) : new Date();
      baseDate.setMonth(baseDate.getMonth() + i);
      const dueStr = baseDate.toISOString().split('T')[0];
      const isLast = i === qty - 1;
      const amount = isLast
        ? Number((installmentTotal - (Number(installmentValue.toFixed(2)) * (qty - 1))).toFixed(2))
        : Number(installmentValue.toFixed(2));

      invs.push({
        amount,
        due_date: dueStr,
        payment_method: paymentMethod,
        description: qty > 1 ? `Parcela ${i + 1}/${qty} - ${courseName}` : `Mensalidade/Curso - ${courseName}`,
        amountFormatted: currencyApplyMask(String(Math.round(amount * 100))),
      });
    }

    return invs;
  }, [generateInvoices, coursePricing, separateEnrollmentFee, installments, feeDueDate, firstDueDate, paymentMethod, selectedCourse]);

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
        const courseName = (selectedCourse as any)?.nome || (selectedCourse as any)?.name || 'Curso';
        const subtotal = coursePricing?.subtotal !== undefined ? coursePricing.subtotal : 0;
        const total = coursePricing?.total !== undefined ? coursePricing.total : subtotal;

        const enrollmentPayload: any = {
          name: `Interesse - ${courseName}`,
          student_id: createdClientId,
          id_cliente: createdClientId,
          course_id: String(courseId),
          id_curso: String(courseId),
          id_turma: turmaId && turmaId !== 'none' ? Number(turmaId) : 0,
          turma_id: turmaId && turmaId !== 'none' ? String(turmaId) : '0',
          subtotal: subtotal.toFixed(2),
          total: total.toFixed(2),
          amount_brl: total,
        };

        // Se o usuário optou por gerar faturas no financeiro agora
        if (generateInvoices && plannedInvoices.length > 0) {
          enrollmentPayload.invoices = plannedInvoices.map((inv) => ({
            amount: inv.amount,
            due_date: inv.due_date,
            payment_method: inv.payment_method,
            description: inv.description,
          }));

          enrollmentPayload.meta = {
            parcelada: Number(installments) > 1 ? 's' : 'n',
            parcelas: String(installments),
            forma_pagamento: paymentMethod,
            primeiro_vencimento: firstDueDate,
          };
        }

        const createdEnrollment = await enrollmentsService.createEnrollment(enrollmentPayload);
        const rawId = (createdEnrollment as any)?.id ?? (createdEnrollment as any)?.ID;
        createdEnrollmentId = rawId !== undefined && rawId !== null ? String(rawId) : undefined;
      }

      // Feedback de Sucesso
      if (createdEnrollmentId) {
        if (generateInvoices && plannedInvoices.length > 0) {
          toast.success(`Cliente "${name.trim()}" cadastrado com interesse e ${plannedInvoices.length} fatura(s) gerada(s)!`);
        } else {
          toast.success(`Cliente "${name.trim()}" cadastrado com interesse gerado!`);
        }
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
      <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col p-0 gap-0 overflow-hidden">
        <DialogHeader className="p-6 pb-4 border-b shrink-0">
          <DialogTitle className="flex items-center gap-2 text-lg font-bold">
            <UserPlus className="h-5 w-5 text-primary" />
            Novo Cliente / Lead Rápido
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Cadastre rapidamente o contato e vincule um curso de interesse para inseri-lo no funil comercial.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
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

            {/* Destaque do valor do curso selecionado */}
            {selectedCourse && coursePricing && (
              <div className="flex items-center justify-between px-3 py-1.5 mt-1 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-xs animate-in fade-in-50 duration-200">
                <span className="flex items-center gap-1 font-medium text-emerald-800 dark:text-emerald-300">
                  <DollarSign className="h-3.5 w-3.5" />
                  Valor do Curso:
                </span>
                <div className="flex items-center gap-2">
                  {coursePricing.inscricao > 0 && (
                    <span className="text-[11px] text-muted-foreground">
                      (Taxa: {coursePricing.inscricaoFormatted})
                    </span>
                  )}
                  <span className="font-bold text-emerald-700 dark:text-emerald-300 font-mono">
                    {coursePricing.totalFormatted}
                  </span>
                </div>
              </div>
            )}
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

          {/* Seção Retrátil: Faturamento / Financeiro Imediato */}
          {courseId && courseId !== 'none' && coursePricing && coursePricing.total > 0 && (
            <div className="rounded-xl border border-border/80 bg-slate-50/50 dark:bg-slate-900/40 p-3 space-y-3 animate-in fade-in-50 duration-200">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-xs font-bold text-foreground flex items-center gap-1.5 cursor-pointer" htmlFor="toggle-generate-invoices">
                    <Receipt className="h-3.5 w-3.5 text-primary" />
                    Gerar faturas no financeiro agora?
                  </Label>
                  <p className="text-[11px] text-muted-foreground">
                    Cria automaticamente as contas a receber do aluno
                  </p>
                </div>
                <Switch
                  id="toggle-generate-invoices"
                  checked={generateInvoices}
                  onCheckedChange={setGenerateInvoices}
                  className="data-[state=checked]:bg-emerald-600"
                />
              </div>

              {generateInvoices && (
                <div className="pt-2 border-t space-y-3 animate-in fade-in-50 slide-in-from-top-1 duration-200">
                  {/* Opção: Separar Taxa de Matrícula (se existir inscrição) */}
                  {coursePricing.inscricao > 0 && (
                    <div className="flex items-start gap-2 bg-background p-2.5 rounded-lg border border-border/60">
                      <Checkbox
                        id="separate-fee"
                        checked={separateEnrollmentFee}
                        onCheckedChange={(checked) => setSeparateEnrollmentFee(Boolean(checked))}
                        className="mt-0.5"
                      />
                      <div className="grid gap-0.5 leading-none flex-1">
                        <label
                          htmlFor="separate-fee"
                          className="text-xs font-semibold cursor-pointer flex items-center justify-between"
                        >
                          <span>Cobrar taxa de matrícula separada</span>
                          <span className="font-mono text-emerald-600 font-bold">
                            {coursePricing.inscricaoFormatted}
                          </span>
                        </label>
                        <p className="text-[10px] text-muted-foreground">
                          Gera 1 fatura avulsa para a matrícula e divide o restante nas parcelas
                        </p>
                        {separateEnrollmentFee && (
                          <div className="flex items-center gap-2 mt-2 pt-1 border-t border-dashed">
                            <span className="text-[11px] text-muted-foreground shrink-0">Vencimento da Taxa:</span>
                            <Input
                              type="date"
                              value={feeDueDate}
                              onChange={(e) => setFeeDueDate(e.target.value)}
                              className="h-7 text-xs w-auto px-2 rounded-md"
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Configurações de Parcelamento */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <div className="space-y-1">
                      <Label className="text-[11px] font-medium">Parcelamento</Label>
                      <Select value={installments} onValueChange={setInstallments}>
                        <SelectTrigger className="h-8 text-xs bg-background rounded-lg">
                          <SelectValue placeholder="Parcelas" />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl">
                          <SelectItem value="1">1x (À vista)</SelectItem>
                          {Array.from({ length: 11 }, (_, i) => i + 2).map((num) => (
                            <SelectItem key={num} value={String(num)}>
                              {num}x
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1">
                      <Label className="text-[11px] font-medium">1º Vencimento</Label>
                      <Input
                        type="date"
                        value={firstDueDate}
                        onChange={(e) => setFirstDueDate(e.target.value)}
                        className="h-8 text-xs bg-background rounded-lg px-2"
                      />
                    </div>

                    <div className="space-y-1">
                      <Label className="text-[11px] font-medium">Forma de Pagto</Label>
                      <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                        <SelectTrigger className="h-8 text-xs bg-background rounded-lg">
                          <SelectValue placeholder="Forma" />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl">
                          <SelectItem value="pix">PIX</SelectItem>
                          <SelectItem value="boleto">Boleto Bancário</SelectItem>
                          <SelectItem value="credit_card">Cartão de Crédito</SelectItem>
                          <SelectItem value="debit_card">Cartão de Débito</SelectItem>
                          <SelectItem value="cash">Dinheiro</SelectItem>
                          <SelectItem value="bank_transfer">Transferência</SelectItem>
                          <SelectItem value="other">Outro</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Resumo visual compacto das faturas programadas */}
                  {plannedInvoices.length > 0 && (
                    <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-2 text-xs space-y-1">
                      <div className="flex items-center justify-between font-medium text-emerald-800 dark:text-emerald-300 text-[11px]">
                        <span className="flex items-center gap-1">
                          <Sparkles className="h-3 w-3" />
                          Plano: {plannedInvoices.length} fatura(s) programada(s)
                        </span>
                        <span className="font-bold font-mono">
                          Total: {coursePricing.totalFormatted}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-1 text-[10px] text-muted-foreground pt-1">
                        {plannedInvoices.slice(0, 3).map((inv, idx) => (
                          <span key={idx} className="bg-background/80 border px-1.5 py-0.5 rounded">
                            {inv.amountFormatted} ({inv.due_date.split('-').reverse().slice(0, 2).join('/')})
                          </span>
                        ))}
                        {plannedInvoices.length > 3 && (
                          <span className="bg-background/80 border px-1.5 py-0.5 rounded font-medium">
                            +{plannedInvoices.length - 3} parcela(s)
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          </div>

          {/* Rodapé Fixo com Botões de Ação */}
          <div className="flex items-center justify-end gap-2 p-4 px-6 border-t bg-muted/20 shrink-0">
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
