import React, { useEffect, useMemo, useState } from 'react';
import { UseFormReturn } from 'react-hook-form';
import {
  CreditCard,
  DollarSign,
  Calendar,
  Sparkles,
  RefreshCw,
  Plus,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  Lock,
  Unlock,
  FileText,
  ExternalLink,
  QrCode,
  Barcode,
  Receipt,
  Check,
  Calculator,
  Layers,
  SplitSquareVertical,
  Wallet,
  Clock,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Checkbox } from '@/components/ui/checkbox';
import {
  currencyApplyMask,
  currencyRemoveMaskToNumber,
  currencyRemoveMaskToString,
} from '@/lib/masks/currency';
import {
  BillingStrategyKey,
  InstallmentDraftRow,
  InstallmentStrategyRegistry,
  getDefaultDueDateIso,
} from '@/lib/financial/installmentStrategies';
import { enrollmentsService } from '@/services/enrollmentsService';
import { financialService } from '@/services/financialService';
import { PaymentMethod } from '@/types/financial';
import { useToast } from '@/hooks/use-toast';
import BudgetPreview from './BudgetPreview';

interface EnrollmentBillingPlannerProps {
  form: UseFormReturn<any>;
  mode: 'create' | 'edit';
  enrollmentId?: string;
  enrollment?: any;
  selectedCourse?: any;
  selectedClient?: any;
  selectedModule?: any;
  isInterested?: boolean;
  validityDate?: string;
  onInvoicesChange?: (invoices: InstallmentDraftRow[], strategy: BillingStrategyKey) => void;
  onRefetchEnrollment?: () => void;
}

const PAYMENT_METHOD_OPTIONS = [
  { value: 'pix', label: 'PIX' },
  { value: 'boleto', label: 'Boleto Bancário' },
  { value: 'credit_card', label: 'Cartão de Crédito' },
  { value: 'debit_card', label: 'Cartão de Débito' },
  { value: 'cash', label: 'Dinheiro / Espécie' },
  { value: 'bank_transfer', label: 'Transferência / TED' },
  { value: 'other', label: 'Outro' },
];

export function formatCurrencyBRL(value: number): string {
  try {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
      Number(value) || 0
    );
  } catch {
    return `R$ ${(Number(value) || 0).toFixed(2)}`;
  }
}

export default function EnrollmentBillingPlanner({
  form,
  mode,
  enrollmentId,
  enrollment,
  selectedCourse,
  selectedClient,
  selectedModule,
  isInterested,
  validityDate,
  onInvoicesChange,
  onRefetchEnrollment,
}: EnrollmentBillingPlannerProps) {
  const { toast } = useToast();

  // Estados de configuração da estratégia
  const [strategyKey, setStrategyKey] = useState<BillingStrategyKey>('bundled');
  const isEnrolled = (() => {
    const s = String(enrollment?.situacao ?? enrollment?.status ?? '').toLowerCase();
    return s.startsWith('mat') || s.startsWith('cur') || s.startsWith('con');
  })();
  const [firstDueDate, setFirstDueDate] = useState<string>(() => getDefaultDueDateIso(5));
  const [feeDueDate, setFeeDueDate] = useState<string>(() => getDefaultDueDateIso(2));
  const [offsetCourseAfterFee, setOffsetCourseAfterFee] = useState<boolean>(true);
  const [defaultPaymentMethod, setDefaultPaymentMethod] = useState<string>('pix');
  const [feePaymentMethod, setFeePaymentMethod] = useState<string>('pix');

  // Linhas de parcelas (tanto simuladas quanto carregadas do banco)
  const [rows, setRows] = useState<InstallmentDraftRow[]>([]);
  const [lockedIndices, setLockedIndices] = useState<Set<number>>(new Set());
  const [hasManualEdits, setHasManualEdits] = useState<boolean>(false);
  const [hydratedEnrollmentId, setHydratedEnrollmentId] = useState<string | null>(null);

  // Estados operacionais (sincronização / baixa / Asaas / preview de proposta)
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [isBatchGenerating, setIsBatchGenerating] = useState<boolean>(false);
  const [selectedRowIds, setSelectedRowIds] = useState<Set<string | number>>(new Set());
  const [processingRowId, setProcessingRowId] = useState<string | number | null>(null);
  const [proposalPreviewOpen, setProposalPreviewOpen] = useState<boolean>(false);

  // Watchers dos valores do formulário
  const subtotalWatched = form.watch('subtotal') || '';
  const inscricaoWatched = form.watch('inscricao') || '';
  const descontoWatched = form.watch('desconto') || '';
  const totalWatched = form.watch('total') || '';
  const parcelasWatched = form.watch('parcelas') || '12';

  const subtotalNum = useMemo(() => currencyRemoveMaskToNumber(subtotalWatched), [subtotalWatched]);
  const inscricaoNum = useMemo(() => currencyRemoveMaskToNumber(inscricaoWatched), [inscricaoWatched]);
  const descontoNum = useMemo(() => currencyRemoveMaskToNumber(descontoWatched), [descontoWatched]);
  const totalNum = useMemo(() => currencyRemoveMaskToNumber(totalWatched), [totalWatched]);
  const parcelasNum = useMemo(() => Math.max(1, Number(parcelasWatched || '1')), [parcelasWatched]);

  // Valores tabelados do curso (para ajudar quando a matrícula está zerada)
  const courseDefaultValor = useMemo(() => {
    const raw =
      selectedCourse?.valor ??
      enrollment?.curso_valor ??
      enrollment?.curso?.valor ??
      0;
    return Number(currencyRemoveMaskToString(String(raw)) || 0);
  }, [selectedCourse, enrollment]);

  const courseDefaultInscricao = useMemo(() => {
    const raw =
      selectedCourse?.inscricao ??
      enrollment?.curso_inscricao ??
      enrollment?.curso?.inscricao ??
      0;
    return Number(currencyRemoveMaskToString(String(raw)) || 0);
  }, [selectedCourse, enrollment]);

  const courseTitle = useMemo(() => {
    return (
      selectedCourse?.titulo ||
      selectedCourse?.nome ||
      enrollment?.curso_titulo ||
      enrollment?.curso_nome ||
      'Curso'
    );
  }, [selectedCourse, enrollment]);

  // Hidratação inicial quando estamos editando uma matrícula existente
  useEffect(() => {
    if (mode !== 'edit' || !enrollment) return;
    const currentId = String(enrollment.id || '');
    if (!currentId || hydratedEnrollmentId === currentId) return;

    const existingInvoices: any[] = Array.isArray(enrollment.financial_invoices)
      ? enrollment.financial_invoices
      : [];

    const savedStrategy = enrollment?.meta?.billing_strategy as BillingStrategyKey | undefined;
    const savedParcelada =
      String(enrollment?.meta?.parcelada) === 'true' ||
      String(enrollment?.meta?.parcelada) === 's';

    if (existingInvoices.length > 0) {
      const mappedRows: InstallmentDraftRow[] = existingInvoices.map((inv: any, idx: number) => {
        const cfg =
          typeof inv.config === 'string'
            ? JSON.parse(inv.config || '{}')
            : inv.config || {};
        const desc = String(inv.description || `Parcela ${idx + 1}`);
        const isFee =
          cfg.installment_type === 'enrollment_fee' ||
          desc.toLowerCase().includes('taxa de matrícula') ||
          desc.toLowerCase().includes('inscrição');

        return {
          id: inv.id,
          description: desc,
          amount: Number(inv.amount || 0).toFixed(2),
          due_date: String(inv.due_date || '').split('T')[0] || getDefaultDueDateIso(5),
          payment_method: inv.payment_method || 'pix',
          installment_type: isFee ? 'enrollment_fee' : existingInvoices.length === 1 ? 'single' : 'tuition',
          installment_index: Number(cfg.installment_index ?? idx + 1),
          status: inv.status || 'pending',
          invoice_url: cfg.invoice_url || undefined,
          is_locked: inv.status === 'paid',
        };
      });

      setRows(mappedRows);
      setHasManualEdits(true); // Preserva as faturas carregadas do banco até o usuário pedir recálculo

      const hasFeeRow = mappedRows.some((r) => r.installment_type === 'enrollment_fee');
      const hasTuitionRow = mappedRows.some((r) => r.installment_type === 'tuition');

      if (savedStrategy) {
        setStrategyKey(savedStrategy);
      } else if (hasFeeRow && hasTuitionRow) {
        setStrategyKey('separate_fee');
      } else if (hasFeeRow && !hasTuitionRow) {
        setStrategyKey('only_fee');
      } else if (mappedRows.length === 1) {
        setStrategyKey('single');
      } else {
        setStrategyKey('bundled');
      }

      if (mappedRows[0]?.due_date) {
        setFirstDueDate(mappedRows[0].due_date);
      }
    } else {
      // Sem faturas salvas ainda
      if (savedStrategy) {
        setStrategyKey(savedStrategy);
      } else if (savedParcelada) {
        setStrategyKey('bundled');
      } else {
        setStrategyKey('none');
      }
      setHasManualEdits(false);
    }

    setHydratedEnrollmentId(currentId);
  }, [mode, enrollment, hydratedEnrollmentId]);

  // No modo de criação, ajusta a estratégia inicial conforme configuração do curso
  useEffect(() => {
    if (mode !== 'create' || !selectedCourse) return;
    if (selectedCourse?.config?.cobrar_taxa_separadamente === 's' && courseDefaultInscricao > 0) {
      setStrategyKey('separate_fee');
      form.setValue('parcelada', 's');
    }
  }, [mode, selectedCourse, courseDefaultInscricao, form]);

  // Função que executa o Strategy Pattern para recalcular as parcelas
  const recalculateWithStrategy = (
    targetStrategy: BillingStrategyKey = strategyKey,
    preservePaidRows = true
  ) => {
    const paidRows = preservePaidRows ? rows.filter((r) => r.status === 'paid') : [];
    const paidSum = paidRows.reduce((acc, r) => acc + (Number(r.amount) || 0), 0);

    if (targetStrategy === 'none') {
      setRows(paidRows);
      setLockedIndices(new Set(paidRows.map((_, i) => i)));
      setHasManualEdits(false);
      form.setValue('parcelada', mode === 'create' ? 'n' : false);
      return;
    }

    form.setValue('parcelada', mode === 'create' ? 's' : true);

    const effectiveTotal = Math.max(0, Number((totalNum - paidSum).toFixed(2)));
    const alreadyPaidFee = paidRows.some((r) => r.installment_type === 'enrollment_fee');
    const effectiveInscricao = alreadyPaidFee ? 0 : inscricaoNum;

    const strategy = InstallmentStrategyRegistry.get(targetStrategy);
    const calculated = strategy.calculate({
      subtotal: subtotalNum,
      inscricao: effectiveInscricao,
      desconto: descontoNum,
      total: effectiveTotal,
      parcelas: parcelasNum,
      firstDueDate,
      feeDueDate,
      offsetCourseAfterFee,
      paymentMethod: defaultPaymentMethod,
      feePaymentMethod,
      courseTitle,
    });

    const merged = [...paidRows, ...calculated];
    setRows(merged);
    setLockedIndices(new Set(paidRows.map((_, i) => i)));
    setHasManualEdits(false);
  };

  // Recalcula automaticamente quando os parâmetros mudam e o usuário não travou edição manual
  useEffect(() => {
    if (hasManualEdits) return;
    recalculateWithStrategy(strategyKey, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    strategyKey,
    subtotalNum,
    inscricaoNum,
    descontoNum,
    totalNum,
    parcelasNum,
    firstDueDate,
    feeDueDate,
    offsetCourseAfterFee,
    defaultPaymentMethod,
    feePaymentMethod,
    courseTitle,
  ]);

  // Notifica o componente pai sempre que as linhas ou estratégia mudam
  useEffect(() => {
    onInvoicesChange?.(rows, strategyKey);
  }, [rows, strategyKey, onInvoicesChange]);

  // Soma atual das parcelas vs Total esperado
  const scheduleSum = useMemo(() => {
    return Number(rows.reduce((sum, r) => sum + (Number(r.amount) || 0), 0).toFixed(2));
  }, [rows]);

  const targetExpectedTotal = useMemo(() => {
    if (strategyKey === 'only_fee') return inscricaoNum;
    if (strategyKey === 'none') return 0;
    return totalNum;
  }, [strategyKey, inscricaoNum, totalNum]);

  const balanceDifference = useMemo(() => {
    if (strategyKey === 'none' || rows.length === 0) return 0;
    return Number((targetExpectedTotal - scheduleSum).toFixed(2));
  }, [strategyKey, rows.length, targetExpectedTotal, scheduleSum]);

  // Handlers de preenchimento rápido e edição de parcelas
  const handleApplyCourseDefaults = () => {
    const subMasked = formatCurrencyBRL(courseDefaultValor);
    const inscMasked = formatCurrencyBRL(courseDefaultInscricao);
    form.setValue('subtotal', subMasked, { shouldDirty: true, shouldValidate: true });
    form.setValue('inscricao', inscMasked, { shouldDirty: true, shouldValidate: true });
    const tot = Math.max(0, courseDefaultValor + courseDefaultInscricao - descontoNum);
    form.setValue('total', formatCurrencyBRL(tot), { shouldDirty: true, shouldValidate: true });
    setHasManualEdits(false);
    if (strategyKey === 'none') {
      setStrategyKey(courseDefaultInscricao > 0 ? 'separate_fee' : 'bundled');
    }
    toast({
      title: 'Valores preenchidos',
      description: 'Os valores padrão do curso foram aplicados à matrícula.',
    });
  };

  const handleSelectStrategy = (newStrategy: BillingStrategyKey) => {
    setStrategyKey(newStrategy);
    if (newStrategy === 'single') {
      form.setValue('parcelas', '1');
    } else if (
      (newStrategy === 'bundled' || newStrategy === 'separate_fee') &&
      Number(form.getValues('parcelas') || 1) <= 1
    ) {
      form.setValue('parcelas', '6');
    }
    setHasManualEdits(false);
    recalculateWithStrategy(newStrategy, true);
  };

  const handleRowChange = (
    index: number,
    field: keyof InstallmentDraftRow,
    value: string
  ) => {
    setHasManualEdits(true);
    setRows((prev) => {
      const next = [...prev];
      const current = { ...next[index] };

      if (field === 'amount') {
        const num = currencyRemoveMaskToNumber(value);
        current.amount = num.toFixed(2);
        current.is_locked = true;
      } else {
        (current as any)[field] = value;
      }

      next[index] = current;
      return next;
    });

    if (field === 'amount') {
      setLockedIndices((prev) => {
        const next = new Set(prev);
        next.add(index);
        return next;
      });
    }
  };

  const handleToggleLockRow = (index: number) => {
    if (rows[index]?.status === 'paid') return;
    setLockedIndices((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  const handleRedistributeDifference = () => {
    const updated = InstallmentStrategyRegistry.redistributeRemainingBalance(
      rows,
      targetExpectedTotal,
      lockedIndices
    );
    setRows(updated);
    toast({
      title: 'Parcelas reequilibradas',
      description: `O saldo restante foi distribuído automaticamente para fechar em ${formatCurrencyBRL(targetExpectedTotal)}.`,
    });
  };

  const handleAddCustomRow = () => {
    setHasManualEdits(true);
    const lastRow = rows[rows.length - 1];
    const nextDue = lastRow?.due_date
      ? (() => {
          const d = new Date(lastRow.due_date + 'T12:00:00');
          d.setMonth(d.getMonth() + 1);
          return d.toISOString().split('T')[0];
        })()
      : getDefaultDueDateIso(30);

    const diff = Math.max(0, totalNum - scheduleSum);

    setRows((prev) => [
      ...prev,
      {
        description: `Parcela Extra ${prev.length + 1} - ${courseTitle}`,
        amount: diff > 0 ? diff.toFixed(2) : '0.00',
        due_date: nextDue,
        payment_method: defaultPaymentMethod,
        installment_type: 'tuition',
        installment_index: prev.length + 1,
        status: 'pending',
      },
    ]);
  };

  const handleRemoveRow = (index: number) => {
    const target = rows[index];
    if (target?.status === 'paid') {
      toast({
        title: 'Parcela já paga',
        description: 'Parcelas já recebidas não podem ser removidas para preservar o histórico financeiro.',
        variant: 'destructive',
      });
      return;
    }
    setHasManualEdits(true);
    setRows((prev) => prev.filter((_, i) => i !== index));
    setLockedIndices((prev) => {
      const next = new Set<number>();
      prev.forEach((lockedIdx) => {
        if (lockedIdx < index) next.add(lockedIdx);
        if (lockedIdx > index) next.add(lockedIdx - 1);
      });
      return next;
    });
  };

  // Sincronização imediata no backend (para modo Edit)
  const handleSyncNow = async () => {
    if (!enrollmentId) return;
    setIsSyncing(true);
    try {
      const payload = {
        subtotal: currencyRemoveMaskToString(subtotalWatched) || '0.00',
        inscricao: currencyRemoveMaskToString(inscricaoWatched) || '0.00',
        desconto: currencyRemoveMaskToString(descontoWatched) || '0.00',
        total: currencyRemoveMaskToString(totalWatched) || '0.00',
        mode: strategyKey === 'none' && rows.filter((r) => r.status !== 'paid').length === 0
          ? 'clear_pending'
          : 'replace_pending',
        invoices: rows.map((r, idx) => ({
          id: r.id,
          description: r.description,
          amount: Number(r.amount || 0),
          due_date: r.due_date,
          payment_method: r.payment_method,
          installment_type: r.installment_type,
          installment_index: idx + 1,
        })),
        meta: {
          billing_strategy: strategyKey,
          parcelada: strategyKey !== 'none' && strategyKey !== 'single',
          parcelas: String(parcelasNum),
          primeiro_vencimento: firstDueDate,
          forma_pagamento: defaultPaymentMethod,
        },
      };

      const res = await enrollmentsService.syncEnrollmentInvoices(enrollmentId, payload);
      if (Array.isArray(res?.financial_invoices)) {
        const refreshed: InstallmentDraftRow[] = res.financial_invoices.map((inv: any, idx: number) => {
          const cfg =
            typeof inv.config === 'string'
              ? JSON.parse(inv.config || '{}')
              : inv.config || {};
          return {
            id: inv.id,
            description: inv.description,
            amount: Number(inv.amount || 0).toFixed(2),
            due_date: String(inv.due_date || '').split('T')[0],
            payment_method: inv.payment_method || 'pix',
            installment_type: cfg.installment_type || 'tuition',
            installment_index: Number(cfg.installment_index ?? idx + 1),
            status: inv.status || 'pending',
            invoice_url: cfg.invoice_url || undefined,
            is_locked: inv.status === 'paid',
          };
        });
        setRows(refreshed);
        setHasManualEdits(true);
      }

      onRefetchEnrollment?.();
      toast({
        title: 'Financeiro atualizado com sucesso!',
        description:
          rows.length > 0
            ? `${rows.length} parcela(s) sincronizada(s) no Contas a Receber.`
            : 'Parcelas pendentes limpas com sucesso.',
      });
    } catch (error: any) {
      toast({
        title: 'Erro ao sincronizar parcelas',
        description: error?.response?.data?.message || error?.message || 'Tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setIsSyncing(false);
    }
  };

  // Dar baixa rápida em uma fatura já salva
  const handleQuickReceive = async (row: InstallmentDraftRow) => {
    if (!row.id) return;
    setProcessingRowId(row.id);
    try {
      const today = new Date().toISOString().split('T')[0];
      await financialService.accountsReceivable.markAsReceived(
        String(row.id),
        today,
        (row.payment_method as PaymentMethod) || PaymentMethod.PIX
      );
      setRows((prev) =>
        prev.map((item) =>
          item.id === row.id ? { ...item, status: 'paid', is_locked: true } : item
        )
      );
      onRefetchEnrollment?.();
      toast({
        title: 'Pagamento recebido!',
        description: `${row.description} marcada como recebida.`,
      });
    } catch (error: any) {
      toast({
        title: 'Erro ao dar baixa',
        description: error?.message || 'Não foi possível marcar a parcela como paga.',
        variant: 'destructive',
      });
    } finally {
      setProcessingRowId(null);
    }
  };

  // Gerar cobrança Asaas (PIX / Boleto) diretamente da linha
  const handleQuickGenerateAsaas = async (row: InstallmentDraftRow, billingType: 'PIX' | 'BOLETO') => {
    if (!row.id) return;
    setProcessingRowId(row.id);
    try {
      const updated: any = await financialService.accountsReceivable.generateCharge(
        String(row.id),
        billingType
      );
      const url = updated?.config?.invoice_url || updated?.data?.config?.invoice_url;
      setRows((prev) =>
        prev.map((item) =>
          item.id === row.id ? { ...item, invoice_url: url || item.invoice_url } : item
        )
      );
      onRefetchEnrollment?.();
      toast({
        title: `Cobrança ${billingType} gerada!`,
        description: 'O link de pagamento já está disponível na parcela.',
      });
    } catch (error: any) {
      toast({
        title: `Erro ao gerar ${billingType}`,
        description: error?.message || 'Verifique o CPF/E-mail do cliente e a integração Asaas.',
        variant: 'destructive',
      });
    } finally {
      setProcessingRowId(null);
    }
  };

  // Seleção múltipla para geração em lote no Asaas
  const toggleSelectRow = (rowId: string | number) => {
    setSelectedRowIds((prev) => {
      const next = new Set(prev);
      if (next.has(rowId)) {
        next.delete(rowId);
      } else {
        next.add(rowId);
      }
      return next;
    });
  };

  const selectableRows = rows.filter((r) => r.id && r.status !== 'paid');
  const allSelectableSelected =
    selectableRows.length > 0 && selectableRows.every((r) => selectedRowIds.has(r.id!));

  const toggleSelectAll = () => {
    if (allSelectableSelected) {
      setSelectedRowIds(new Set());
    } else {
      setSelectedRowIds(new Set(selectableRows.map((r) => r.id!)));
    }
  };

  // Gerar em lote (todas ou selecionadas)
  const handleBatchGenerateAsaas = async (billingType: 'PIX' | 'BOLETO', targetIds?: Array<string | number>) => {
    const idsToProcess = targetIds && targetIds.length > 0
      ? targetIds
      : selectedRowIds.size > 0
      ? Array.from(selectedRowIds)
      : rows.filter((r) => r.id && r.status !== 'paid' && !r.invoice_url).map((r) => r.id!);

    if (idsToProcess.length === 0) {
      toast({
        title: 'Nenhuma parcela pendente',
        description: 'Todas as parcelas salvas já possuem link ou estão quitadas.',
      });
      return;
    }

    setIsBatchGenerating(true);
    let successCount = 0;
    let failCount = 0;

    for (const id of idsToProcess) {
      try {
        setProcessingRowId(id);
        const updated: any = await financialService.accountsReceivable.generateCharge(
          String(id),
          billingType
        );
        const url = updated?.config?.invoice_url || updated?.data?.config?.invoice_url;
        setRows((prev) =>
          prev.map((item) =>
            item.id === id ? { ...item, invoice_url: url || item.invoice_url } : item
          )
        );
        successCount++;
      } catch (err: any) {
        failCount++;
        console.error(`Falha ao gerar ${billingType} para fatura ${id}:`, err);
      }
    }

    setProcessingRowId(null);
    setIsBatchGenerating(false);
    setSelectedRowIds(new Set());
    onRefetchEnrollment?.();

    if (successCount > 0) {
      toast({
        title: `Cobranças geradas no Asaas!`,
        description: `${successCount} fatura(s) foram geradas com sucesso como ${billingType}.${failCount > 0 ? ` (${failCount} falharam)` : ''}`,
      });
    } else if (failCount > 0) {
      toast({
        title: `Erro ao gerar cobranças`,
        description: 'Não foi possível gerar no Asaas. Verifique se o cliente possui CPF/E-mail válidos.',
        variant: 'destructive',
      });
    }
  };

  const paidCount = rows.filter((r) => r.status === 'paid').length;
  const pendingCount = rows.filter((r) => r.status !== 'paid').length;
  const hasUnsavedChanges = rows.some((r) => !r.id);

  const strategyCards: Array<{
    key: BillingStrategyKey;
    title: string;
    subtitle: string;
    icon: any;
    badge?: string;
  }> = [
    {
      key: 'none',
      title: 'Apenas Simular',
      subtitle: 'Não gera cobrança ainda',
      icon: FileText,
      badge: isInterested ? 'Ideal p/ Interessado' : undefined,
    },
    {
      key: 'single',
      title: 'À Vista (1x)',
      subtitle: 'Valor total em 1 cobrança',
      icon: Wallet,
    },
    {
      key: 'bundled',
      title: 'Parcelado Junto',
      subtitle: 'Curso + Taxa diluídos',
      icon: Layers,
    },
    {
      key: 'separate_fee',
      title: 'Taxa Separada + Curso',
      subtitle: '1x Matrícula + N parcelas',
      icon: SplitSquareVertical,
      badge: inscricaoNum > 0 ? 'Recomendado' : undefined,
    },
    {
      key: 'only_fee',
      title: 'Só Taxa de Matrícula',
      subtitle: 'Cobra apenas a inscrição agora',
      icon: Receipt,
    },
  ];

  return (
    <div className="space-y-5">
      {/* Alerta inteligente quando a matrícula está zerada mas o curso possui preço cadastrado */}
      {totalNum === 0 && (courseDefaultValor > 0 || courseDefaultInscricao > 0) && (
        <div className="rounded-xl border border-amber-200 bg-amber-50/80 p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-in fade-in duration-300">
          <div className="flex items-start gap-2.5">
            <Sparkles className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-bold text-amber-900">
                Os valores desta matrícula estão zerados, mas o curso possui tabela de preço!
              </p>
              <p className="text-[11px] text-amber-800">
                Curso: <strong>{formatCurrencyBRL(courseDefaultValor)}</strong>
                {courseDefaultInscricao > 0 && (
                  <>
                    {' '}
                    • Taxa de Matrícula: <strong>{formatCurrencyBRL(courseDefaultInscricao)}</strong>
                  </>
                )}
              </p>
            </div>
          </div>
          <Button
            type="button"
            size="sm"
            onClick={handleApplyCourseDefaults}
            className="bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shrink-0 h-8"
          >
            <Sparkles className="h-3.5 w-3.5 mr-1.5" />
            Puxar Valores do Curso
          </Button>
        </div>
      )}

      {/* PASSO 1: Composição de Valores em Linha */}
      <div className="rounded-xl border bg-slate-50/50 p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="h-6 w-6 rounded-full bg-primary/10 text-primary font-black text-xs flex items-center justify-center">
              1
            </span>
            <h4 className="text-sm font-bold text-foreground">
              Composição do Valor da Matrícula / Proposta
            </h4>
          </div>
          <div className="flex items-center gap-2">
            {(courseDefaultValor > 0 || courseDefaultInscricao > 0) && totalNum > 0 && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleApplyCourseDefaults}
                className="h-7 text-[11px] text-muted-foreground hover:text-primary px-2"
              >
                <RefreshCw className="h-3 w-3 mr-1" />
                Restaurar valor original do curso
              </Button>
            )}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setProposalPreviewOpen(true)}
              className="h-7 text-xs font-semibold gap-1.5 bg-white"
            >
              <FileText className="h-3.5 w-3.5 text-primary" />
              Ver Proposta Comercial
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Valor Base */}
          <FormField
            control={form.control}
            name="subtotal"
            render={({ field }) => (
              <FormItem className="bg-white p-3 rounded-xl border shadow-2xs">
                <FormLabel className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block">
                  Valor do Curso
                </FormLabel>
                <FormControl>
                  <Input
                    placeholder="R$ 0,00"
                    className="font-black text-base h-9 border-slate-200 mt-1"
                    value={field.value || ''}
                    onChange={(e) => {
                      setHasManualEdits(false);
                      field.onChange(currencyApplyMask(e.target.value, 'pt-BR', 'BRL'));
                    }}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Taxa de Matrícula */}
          <FormField
            control={form.control}
            name="inscricao"
            render={({ field }) => (
              <FormItem className="bg-white p-3 rounded-xl border shadow-2xs">
                <FormLabel className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block">
                  + Taxa de Matrícula
                </FormLabel>
                <FormControl>
                  <Input
                    placeholder="R$ 0,00"
                    className="font-black text-base h-9 border-slate-200 mt-1"
                    value={field.value || ''}
                    onChange={(e) => {
                      setHasManualEdits(false);
                      field.onChange(currencyApplyMask(e.target.value, 'pt-BR', 'BRL'));
                    }}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Desconto */}
          <FormField
            control={form.control}
            name="desconto"
            render={({ field }) => (
              <FormItem className="bg-white p-3 rounded-xl border border-red-100 shadow-2xs">
                <FormLabel className="text-[11px] font-bold uppercase tracking-wider text-red-600/80 block">
                  − Desconto Concedido
                </FormLabel>
                <FormControl>
                  <Input
                    placeholder="R$ 0,00"
                    className="font-black text-base text-red-600 h-9 border-red-200 bg-red-50/20 mt-1"
                    value={field.value || ''}
                    onChange={(e) => {
                      setHasManualEdits(false);
                      field.onChange(currencyApplyMask(e.target.value, 'pt-BR', 'BRL'));
                    }}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Total Líquido */}
          <FormField
            control={form.control}
            name="total"
            render={({ field }) => (
              <FormItem className="bg-primary/5 p-3 rounded-xl border-2 border-primary/20 flex flex-col justify-between">
                <FormLabel className="text-[11px] font-black uppercase tracking-wider text-primary block">
                  = Total Final Líquido
                </FormLabel>
                <div className="flex items-center justify-between pt-1">
                  <span className="text-xl font-black text-primary tabular-nums">
                    {field.value || 'R$ 0,00'}
                  </span>
                  <CreditCard className="h-5 w-5 text-primary/40" />
                </div>
              </FormItem>
            )}
          />
        </div>
      </div>

      {/* PASSO 2: Como Cobrar / Estratégia de Parcelamento */}
      <div className="rounded-xl border bg-white p-4 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="h-6 w-6 rounded-full bg-primary/10 text-primary font-black text-xs flex items-center justify-center">
              2
            </span>
            <div>
              <h4 className="text-sm font-bold text-foreground">
                Como deseja gerar as cobranças?
              </h4>
              <p className="text-[11px] text-muted-foreground">
                Escolha se a taxa de matrícula será cobrada junto ou separada do valor do curso.
              </p>
            </div>
          </div>

          {hasManualEdits && strategyKey !== 'none' && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => recalculateWithStrategy(strategyKey, true)}
              className="h-8 text-xs font-bold gap-1.5 border-amber-300 bg-amber-50 text-amber-900 hover:bg-amber-100"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Recalcular Parcelas Pendentes pelo Padrão
            </Button>
          )}
        </div>

        {/* Cards de Estratégia */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5">
          {strategyCards.map((item) => {
            const Icon = item.icon;
            const isSelected = strategyKey === item.key;
            const isDisabled = item.key === 'only_fee' && inscricaoNum <= 0;

            return (
              <button
                key={item.key}
                type="button"
                disabled={isDisabled}
                onClick={() => handleSelectStrategy(item.key)}
                className={`text-left p-3 rounded-xl border-2 transition-all flex flex-col justify-between gap-2 relative ${
                  isSelected
                    ? 'border-primary bg-primary/5 shadow-xs'
                    : 'border-slate-200/80 hover:border-slate-300 bg-white'
                } ${isDisabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}`}
              >
                <div className="flex items-center justify-between gap-1">
                  <div
                    className={`h-7 w-7 rounded-lg flex items-center justify-center ${
                      isSelected ? 'bg-primary text-white' : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                  </div>
                  {item.badge && (
                    <Badge
                      variant="secondary"
                      className="text-[9px] px-1.5 py-0 font-bold bg-emerald-50 text-emerald-700 border-emerald-200"
                    >
                      {item.badge}
                    </Badge>
                  )}
                </div>
                <div>
                  <div className="text-xs font-extrabold text-foreground leading-tight">
                    {item.title}
                  </div>
                  <div className="text-[10px] text-muted-foreground leading-snug mt-0.5">
                    {item.subtitle}
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Parâmetros Rápidos da Estratégia Selecionada */}
        {strategyKey !== 'none' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2 border-t border-dashed">
            {/* Quantidade de Parcelas (para Bundled ou Separate Fee) */}
            {(strategyKey === 'bundled' || strategyKey === 'separate_fee') && (
              <FormField
                control={form.control}
                name="parcelas"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-bold text-foreground/80">
                      Nº de Parcelas do Curso
                    </FormLabel>
                    <Select
                      value={String(field.value || '12')}
                      onValueChange={(val) => {
                        setHasManualEdits(false);
                        field.onChange(val);
                      }}
                    >
                      <SelectTrigger className="h-9 text-xs font-bold">
                        <SelectValue placeholder="Parcelas" />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: 24 }, (_, i) => (
                          <SelectItem key={i + 1} value={String(i + 1)}>
                            {i + 1}x{' '}
                            {totalNum > 0
                              ? `de ~${formatCurrencyBRL(
                                  (strategyKey === 'separate_fee'
                                    ? Math.max(0, totalNum - inscricaoNum)
                                    : totalNum) /
                                    (i + 1)
                                )}`
                              : ''}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />
            )}

            {/* Data de Vencimento da Taxa (quando Taxa Separada ou Só Taxa) */}
            {(strategyKey === 'separate_fee' || strategyKey === 'only_fee') && inscricaoNum > 0 && (
              <div>
                <Label className="text-xs font-bold text-foreground/80 block mb-1.5">
                  Vencimento da Taxa ({formatCurrencyBRL(inscricaoNum)})
                </Label>
                <Input
                  type="date"
                  className="h-9 text-xs font-semibold"
                  value={feeDueDate}
                  onChange={(e) => {
                    setHasManualEdits(false);
                    setFeeDueDate(e.target.value);
                  }}
                />
              </div>
            )}

            {/* 1º Vencimento do Curso / Parcela */}
            {strategyKey !== 'only_fee' && (
              <div>
                <Label className="text-xs font-bold text-foreground/80 block mb-1.5">
                  {strategyKey === 'single'
                    ? 'Data de Vencimento'
                    : strategyKey === 'separate_fee'
                      ? 'Data Base das Parcelas'
                      : '1º Vencimento'}
                </Label>
                <Input
                  type="date"
                  className="h-9 text-xs font-semibold"
                  value={firstDueDate}
                  onChange={(e) => {
                    setHasManualEdits(false);
                    setFirstDueDate(e.target.value);
                  }}
                />
              </div>
            )}

            {/* Forma de Pagamento Padrão */}
            <div>
              <Label className="text-xs font-bold text-foreground/80 block mb-1.5">
                Forma de Pagamento Padrão
              </Label>
              <Select
                value={defaultPaymentMethod}
                onValueChange={(val) => {
                  setHasManualEdits(false);
                  setDefaultPaymentMethod(val);
                  setFeePaymentMethod(val);
                }}
              >
                <SelectTrigger className="h-9 text-xs font-bold">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PAYMENT_METHOD_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Opção de iniciar 1ª parcela do curso 1 mês após a taxa */}
            {strategyKey === 'separate_fee' && inscricaoNum > 0 && (
              <div className="sm:col-span-2 lg:col-span-4 flex items-center justify-between bg-slate-50 px-3 py-2 rounded-lg border">
                <div>
                  <span className="text-xs font-bold text-foreground">
                    Jogar a 1ª parcela do curso para 30 dias após a data base?
                  </span>
                  <p className="text-[11px] text-muted-foreground">
                    Ativado: o aluno paga a Taxa de Matrícula agora e a Parcela 1 vence no mês seguinte.
                  </p>
                </div>
                <Switch
                  checked={offsetCourseAfterFee}
                  onCheckedChange={(checked) => {
                    setHasManualEdits(false);
                    setOffsetCourseAfterFee(checked);
                  }}
                />
              </div>
            )}
          </div>
        )}
      </div>

      {/* PASSO 3: Grade Interativa de Parcelas (Edição rápida + Ações) */}
      <div className="rounded-xl border bg-white overflow-hidden shadow-2xs">
        <div className="bg-slate-50/80 px-4 py-3 border-b flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="h-6 w-6 rounded-full bg-primary/10 text-primary font-black text-xs flex items-center justify-center">
              3
            </span>
            <div>
              <h4 className="text-sm font-bold text-foreground flex items-center gap-2">
                Cronograma de Parcelas e Faturas ({rows.length})
                {paidCount > 0 && (
                  <Badge className="bg-emerald-600 text-white text-[10px] px-2 py-0">
                    {paidCount} paga(s)
                  </Badge>
                )}
                {pendingCount > 0 && (
                  <Badge variant="outline" className="text-[10px] px-2 py-0">
                    {pendingCount} em aberto
                  </Badge>
                )}
              </h4>
              <p className="text-[11px] text-muted-foreground">
                Você pode editar livremente descrição, vencimento, forma de pagamento ou valor de qualquer parcela em aberto.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Ações em Lote para Asaas (quando em edição e com parcelas salvas) */}
            {mode === 'edit' && selectableRows.length > 0 && (
              <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-lg border border-slate-200">
                <span className="text-[10px] font-bold text-slate-500 uppercase px-1.5">
                  Asaas {selectedRowIds.size > 0 ? `(${selectedRowIds.size} sel.)` : '(Todos)'}:
                </span>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={isBatchGenerating}
                  onClick={() => handleBatchGenerateAsaas('BOLETO')}
                  className="h-7 px-2 text-xs font-bold text-slate-800 bg-white hover:bg-slate-50 gap-1 border-slate-300 shadow-2xs"
                  title={
                    selectedRowIds.size > 0
                      ? `Gerar Boleto para as ${selectedRowIds.size} parcelas selecionadas`
                      : 'Gerar Boleto para todas as parcelas pendentes sem cobrança'
                  }
                >
                  {isBatchGenerating ? (
                    <RefreshCw className="h-3 w-3 animate-spin" />
                  ) : (
                    <Barcode className="h-3 w-3 text-slate-600" />
                  )}
                  <span>Gerar Boletos</span>
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={isBatchGenerating}
                  onClick={() => handleBatchGenerateAsaas('PIX')}
                  className="h-7 px-2 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 gap-1 border-emerald-200 shadow-2xs"
                  title={
                    selectedRowIds.size > 0
                      ? `Gerar PIX para as ${selectedRowIds.size} parcelas selecionadas`
                      : 'Gerar PIX para todas as parcelas pendentes sem cobrança'
                  }
                >
                  {isBatchGenerating ? (
                    <RefreshCw className="h-3 w-3 animate-spin" />
                  ) : (
                    <QrCode className="h-3 w-3 text-emerald-600" />
                  )}
                  <span>Gerar PIX</span>
                </Button>
              </div>
            )}

            {Math.abs(balanceDifference) >= 0.01 && rows.length > 0 && (
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={handleRedistributeDifference}
                className="h-8 text-xs font-bold border-amber-300 bg-amber-50 text-amber-900 hover:bg-amber-100 gap-1.5"
              >
                <Calculator className="h-3.5 w-3.5" />
                Distribuir Diferença ({formatCurrencyBRL(Math.abs(balanceDifference))})
              </Button>
            )}

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleAddCustomRow}
              className="h-8 text-xs font-bold gap-1"
            >
              <Plus className="h-3.5 w-3.5" />
              Adicionar Parcela
            </Button>

            {mode === 'edit' && enrollmentId && (
              <Button
                type="button"
                size="sm"
                onClick={handleSyncNow}
                disabled={isSyncing}
                className="h-8 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 shadow-xs"
              >
                {isSyncing ? (
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <CheckCircle2 className="h-3.5 w-3.5" />
                )}
                Aplicar / Salvar Parcelas Agora
              </Button>
            )}
          </div>
        </div>

        {rows.length === 0 ? (
          <div className="p-8 text-center space-y-2">
            <DollarSign className="h-8 w-8 text-muted-foreground/30 mx-auto" />
            <p className="text-sm font-bold text-muted-foreground">
              Nenhuma cobrança será gerada no momento (Modo Simulação / Proposta).
            </p>
            <p className="text-xs text-muted-foreground max-w-md mx-auto">
              Selecione acima <strong>"À Vista"</strong>, <strong>"Parcelado Junto"</strong> ou{' '}
              <strong>"Taxa Separada + Curso"</strong> quando quiser gerar as parcelas.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-muted/40 border-b text-muted-foreground uppercase text-[10px] font-bold">
                <tr>
                  {mode === 'edit' && selectableRows.length > 0 && (
                    <th className="px-2 py-2.5 text-center w-8">
                      <Checkbox
                        checked={allSelectableSelected}
                        onCheckedChange={toggleSelectAll}
                        title="Selecionar todas as parcelas em aberto"
                        className="h-3.5 w-3.5 translate-y-0.5"
                      />
                    </th>
                  )}
                  <th className="px-3 py-2.5 text-left w-10">#</th>
                  <th className="px-3 py-2.5 text-left min-w-[200px]">Descrição da Cobrança</th>
                  <th className="px-3 py-2.5 text-left w-40">Vencimento</th>
                  <th className="px-3 py-2.5 text-left w-44">Forma de Pagto</th>
                  <th className="px-3 py-2.5 text-right w-40">Valor (R$)</th>
                  {mode === 'edit' && <th className="px-3 py-2.5 text-center w-28">Status</th>}
                  <th className="px-3 py-2.5 text-right w-36">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {rows.map((row, idx) => {
                  const isPaid = row.status === 'paid';
                  const isLocked = isPaid || lockedIndices.has(idx);
                  const isFee = row.installment_type === 'enrollment_fee';
                  const isRowLoading = processingRowId !== null && processingRowId === row.id;
                  const isSelected = Boolean(row.id && selectedRowIds.has(row.id));

                  return (
                    <tr
                      key={row.id ? `saved-${row.id}` : `draft-${idx}`}
                      className={`transition-colors ${
                        isSelected
                          ? 'bg-primary/5'
                          : isPaid
                          ? 'bg-emerald-50/40'
                          : isFee
                            ? 'bg-blue-50/20 hover:bg-blue-50/40'
                            : 'hover:bg-slate-50/80'
                      }`}
                    >
                      {mode === 'edit' && selectableRows.length > 0 && (
                        <td className="px-2 py-2 text-center">
                          {row.id && !isPaid ? (
                            <Checkbox
                              checked={isSelected}
                              onCheckedChange={() => toggleSelectRow(row.id!)}
                              title="Selecionar parcela para gerar no Asaas"
                              className="h-3.5 w-3.5 translate-y-0.5"
                            />
                          ) : null}
                        </td>
                      )}
                      <td className="px-3 py-2 font-mono font-bold text-muted-foreground">
                        {isFee ? (
                          <Badge
                            variant="outline"
                            className="bg-blue-50 text-blue-700 border-blue-200 text-[9px] px-1.5 py-0"
                          >
                            TAXA
                          </Badge>
                        ) : (
                          idx + 1
                        )}
                      </td>

                      {/* Descrição Editável */}
                      <td className="px-3 py-2">
                        <Input
                          value={row.description}
                          disabled={isPaid}
                          onChange={(e) => handleRowChange(idx, 'description', e.target.value)}
                          className="h-8 text-xs font-medium bg-white"
                        />
                      </td>

                      {/* Vencimento Editável */}
                      <td className="px-3 py-2">
                        <Input
                          type="date"
                          value={row.due_date}
                          disabled={isPaid}
                          onChange={(e) => handleRowChange(idx, 'due_date', e.target.value)}
                          className="h-8 text-xs font-semibold bg-white"
                        />
                      </td>

                      {/* Método de Pagamento Editável */}
                      <td className="px-3 py-2">
                        <Select
                          value={row.payment_method || 'pix'}
                          disabled={isPaid}
                          onValueChange={(val) => handleRowChange(idx, 'payment_method', val)}
                        >
                          <SelectTrigger className="h-8 text-xs bg-white">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {PAYMENT_METHOD_OPTIONS.map((opt) => (
                              <SelectItem key={opt.value} value={opt.value}>
                                {opt.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </td>

                      {/* Valor Editável */}
                      <td className="px-3 py-2 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Input
                            value={formatCurrencyBRL(Number(row.amount || 0))}
                            disabled={isPaid}
                            onChange={(e) => handleRowChange(idx, 'amount', e.target.value)}
                            className={`h-8 text-xs font-black text-right bg-white w-28 ${
                              isLocked && !isPaid ? 'border-amber-400 bg-amber-50/30' : ''
                            }`}
                          />
                          {!isPaid && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => handleToggleLockRow(idx)}
                              title={
                                isLocked
                                  ? 'Valor fixado manualmente (clique para destravar ao redistribuir)'
                                  : 'Travar valor desta parcela'
                              }
                              className={`h-7 w-7 shrink-0 ${
                                isLocked ? 'text-amber-600 bg-amber-50' : 'text-slate-300 hover:text-slate-600'
                              }`}
                            >
                              {isLocked ? (
                                <Lock className="h-3.5 w-3.5" />
                              ) : (
                                <Unlock className="h-3.5 w-3.5" />
                              )}
                            </Button>
                          )}
                        </div>
                      </td>

                      {/* Status da Fatura (no modo Edição) */}
                      {mode === 'edit' && (
                        <td className="px-3 py-2 text-center">
                          {isPaid ? (
                            <Badge className="bg-emerald-600 text-white text-[10px] gap-1">
                              <Check className="h-3 w-3" /> Pago
                            </Badge>
                          ) : row.id ? (
                            <Badge
                              variant="secondary"
                              className="bg-amber-50 text-amber-800 border-amber-200 text-[10px]"
                            >
                              Aberta
                            </Badge>
                          ) : (
                            <Badge
                              variant="outline"
                              className="text-blue-600 border-blue-200 bg-blue-50/40 text-[10px]"
                            >
                              Nova (Não salva)
                            </Badge>
                          )}
                        </td>
                      )}

                      {/* Ações Rápidas da Linha */}
                      <td className="px-3 py-2 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {mode === 'edit' && row.id && !isPaid && (
                            <>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                disabled={isRowLoading}
                                onClick={() => handleQuickReceive(row)}
                                title="Dar Baixa Rápida (Marcar como Recebida Hoje)"
                                className="h-7 w-7 text-emerald-600 hover:bg-emerald-50"
                              >
                                <Check className="h-3.5 w-3.5" />
                              </Button>

                              {row.invoice_url ? (
                                <a
                                  href={row.invoice_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  title="Abrir Link do Boleto / PIX do Asaas"
                                  className="h-7 px-2 inline-flex items-center gap-1 rounded-md text-xs font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 transition-colors"
                                >
                                  <ExternalLink className="h-3.5 w-3.5" />
                                  <span>Boleto/Link</span>
                                </a>
                              ) : (
                                <div className="flex items-center gap-0.5">
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    disabled={isRowLoading}
                                    onClick={() => handleQuickGenerateAsaas(row, 'BOLETO')}
                                    title="Gerar Boleto Bancário no Asaas"
                                    className="h-7 px-1.5 text-xs font-semibold text-slate-700 hover:text-primary hover:bg-slate-100 gap-1"
                                  >
                                    <Barcode className="h-3.5 w-3.5 text-slate-500" />
                                    <span className="hidden sm:inline">Boleto</span>
                                  </Button>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    disabled={isRowLoading}
                                    onClick={() => handleQuickGenerateAsaas(row, 'PIX')}
                                    title="Gerar Cobrança PIX com QR Code no Asaas"
                                    className="h-7 px-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-50 gap-1"
                                  >
                                    <QrCode className="h-3.5 w-3.5" />
                                    <span className="hidden sm:inline">PIX</span>
                                  </Button>
                                </div>
                              )}
                            </>
                          )}

                          {!isPaid && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => handleRemoveRow(idx)}
                              title="Remover esta parcela"
                              className="h-7 w-7 text-red-500 hover:bg-red-50"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>

              {/* Rodapé Conciliador */}
              <tfoot className="bg-slate-50 border-t font-bold text-xs">
                <tr>
                  <td colSpan={mode === 'edit' && selectableRows.length > 0 ? 5 : 4} className="px-3 py-2.5 text-right text-muted-foreground">
                    Soma das Parcelas:
                  </td>
                  <td className="px-3 py-2.5 text-right font-black text-sm tabular-nums">
                    <span
                      className={
                        Math.abs(balanceDifference) < 0.01
                          ? 'text-emerald-600'
                          : 'text-amber-600'
                      }
                    >
                      {formatCurrencyBRL(scheduleSum)}
                    </span>
                  </td>
                  <td colSpan={mode === 'edit' ? 2 : 1} className="px-3 py-2.5 text-left">
                    {Math.abs(balanceDifference) < 0.01 ? (
                      <span className="inline-flex items-center gap-1 text-[11px] text-emerald-700 font-bold">
                        <CheckCircle2 className="h-3.5 w-3.5" /> Soma exata com o esperado
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[11px] text-amber-700 font-bold">
                        <AlertTriangle className="h-3.5 w-3.5" />
                        Diferença de {formatCurrencyBRL(Math.abs(balanceDifference))} (use "Distribuir Diferença")
                      </span>
                    )}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}

        {mode === 'edit' && hasUnsavedChanges && rows.length > 0 && (
          <div className="bg-blue-50/70 border-t border-blue-100 px-4 py-2.5 flex items-center justify-between gap-2 text-xs text-blue-900">
            <span className="font-medium">
              💡 Você alterou a simulação das parcelas. Clique em{' '}
              <strong>"Aplicar / Salvar Parcelas Agora"</strong> acima ou no botão{' '}
              <strong>"Salvar"</strong> no rodapé para gravar as novas faturas.
            </span>
          </div>
        )}
      </div>

      {/* Modal sob demanda para Visualizar / Imprimir Proposta Comercial */}
      <Dialog open={proposalPreviewOpen} onOpenChange={setProposalPreviewOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Simulação da Proposta Comercial</DialogTitle>
            <DialogDescription>
              Visualização limpa do orçamento para conferência ou impressão.
            </DialogDescription>
          </DialogHeader>
          <BudgetPreview
            title="Proposta Comercial"
            proposalNumber={enrollmentId}
            clientName={selectedClient?.name || selectedClient?.nome || ''}
            clientId={selectedClient?.id ? String(selectedClient.id) : undefined}
            clientPhone={
              selectedClient?.config?.celular ||
              selectedClient?.config?.telefone_residencial ||
              ''
            }
            clientEmail={selectedClient?.email || ''}
            course={selectedCourse as any}
            module={selectedModule}
            discountLabel="Desconto Concedido"
            discountAmountMasked={descontoWatched}
            subtotalMasked={subtotalWatched}
            totalMasked={totalWatched}
            validityDate={validityDate}
            status={isEnrolled ? 'Matrícula Efetivada' : 'Aguardando Aprovação'}
            installments={rows.map((r) => ({
              numero: r.numero,
              descricao: r.descricao,
              vencimento: r.vencimento,
              valor: r.valor,
              forma_pagamento: r.forma_pagamento,
            }))}
            allowActions={true}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}

