/**
 * Padrão Strategy (Strategy Pattern) para Cálculo e Simulação de Parcelas de Matrículas e Propostas.
 * Permite alternar suavemente entre diferentes modelos de cobrança:
 * - Simulação sem gerar cobrança ('none')
 * - Pagamento à Vista ('single')
 * - Parcelado Tudo Junto ('bundled')
 * - Taxa de Matrícula Separada + Parcelas do Curso ('separate_fee')
 * - Apenas Taxa de Matrícula Agora ('only_fee')
 */

export type BillingStrategyKey = 'none' | 'single' | 'bundled' | 'separate_fee' | 'only_fee';

export interface InstallmentDraftRow {
  id?: string | number;
  description: string;
  amount: string; // Ex: "250.00"
  due_date: string; // YYYY-MM-DD
  payment_method: string; // 'pix' | 'boleto' | 'credit_card' | 'debit_card' | 'cash' | 'bank_transfer' | 'other'
  installment_type: 'enrollment_fee' | 'tuition' | 'single';
  installment_index: number;
  status?: 'pending' | 'paid' | 'overdue' | 'cancelled';
  invoice_url?: string;
  is_locked?: boolean; // Faturas já pagas ou editadas manualmente pelo usuário
}

export interface InstallmentStrategyParams {
  subtotal: number;
  inscricao: number;
  desconto: number;
  total: number;
  parcelas: number;
  firstDueDate: string; // YYYY-MM-DD
  feeDueDate?: string; // YYYY-MM-DD
  offsetCourseAfterFee?: boolean;
  paymentMethod: string;
  feePaymentMethod?: string;
  courseTitle: string;
}

export interface InstallmentCalculationStrategy {
  readonly key: BillingStrategyKey;
  readonly label: string;
  readonly shortDescription: string;
  calculate(params: InstallmentStrategyParams): InstallmentDraftRow[];
}

/**
 * Adiciona meses a uma string YYYY-MM-DD preservando fuso local e evitando overflow de fim de mês.
 */
export function addMonthsToIsoDate(isoDate: string, monthsToAdd: number): string {
  const clean = (isoDate || '').split('T')[0];
  const parts = clean.split('-').map(Number);
  const base =
    parts.length === 3 && !parts.some(isNaN)
      ? new Date(parts[0], parts[1] - 1, parts[2], 12, 0, 0)
      : new Date();

  const targetMonth = base.getMonth() + monthsToAdd;
  const result = new Date(base.getFullYear(), targetMonth, base.getDate(), 12, 0, 0);

  // Evita pular de 31/01 para 03/03
  if (result.getMonth() !== ((targetMonth % 12) + 12) % 12) {
    result.setDate(0);
  }

  const yyyy = result.getFullYear();
  const mm = String(result.getMonth() + 1).padStart(2, '0');
  const dd = String(result.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

export function getDefaultDueDateIso(daysAhead = 5): string {
  const d = new Date();
  d.setDate(d.getDate() + daysAhead);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

/**
 * 1. Estratégia: Apenas Simular Proposta (Não gera faturas ainda)
 */
export class SimulationOnlyStrategy implements InstallmentCalculationStrategy {
  readonly key: BillingStrategyKey = 'none';
  readonly label = 'Apenas Proposta (Sem Faturas)';
  readonly shortDescription = 'Salva os valores comerciais sem lançar cobranças no Contas a Receber ainda.';

  calculate(): InstallmentDraftRow[] {
    return [];
  }
}

/**
 * 2. Estratégia: Pagamento à Vista (1x)
 */
export class SinglePaymentStrategy implements InstallmentCalculationStrategy {
  readonly key: BillingStrategyKey = 'single';
  readonly label = 'À Vista (1x)';
  readonly shortDescription = 'Gera 1 cobrança única com o valor total líquido (Curso + Matrícula - Desconto).';

  calculate(params: InstallmentStrategyParams): InstallmentDraftRow[] {
    const total = Math.max(0, Number(params.total.toFixed(2)));
    if (total <= 0) return [];

    const dueDate = params.firstDueDate || getDefaultDueDateIso(3);
    const courseTitle = params.courseTitle || 'Curso';

    return [
      {
        description: `Pagamento à Vista - ${courseTitle}`,
        amount: total.toFixed(2),
        due_date: dueDate,
        payment_method: params.paymentMethod || 'pix',
        installment_type: 'single',
        installment_index: 1,
      },
    ];
  }
}

/**
 * 3. Estratégia: Parcelado com Taxa Inclusa (Junto nas parcelas)
 */
export class BundledInstallmentStrategy implements InstallmentCalculationStrategy {
  readonly key: BillingStrategyKey = 'bundled';
  readonly label = 'Parcelado (Taxa Junto)';
  readonly shortDescription = 'Soma o valor do curso e a taxa de matrícula e divide igualmente nas parcelas.';

  calculate(params: InstallmentStrategyParams): InstallmentDraftRow[] {
    const total = Math.max(0, Number(params.total.toFixed(2)));
    if (total <= 0) return [];

    const qty = Math.max(1, Math.min(48, Math.floor(params.parcelas || 1)));
    const firstDue = params.firstDueDate || getDefaultDueDateIso(5);
    const courseTitle = params.courseTitle || 'Curso';
    const baseInstallment = Math.floor((total / qty) * 100) / 100;

    const rows: InstallmentDraftRow[] = [];
    for (let i = 1; i <= qty; i++) {
      const amount =
        i === qty
          ? Number((total - baseInstallment * (qty - 1)).toFixed(2))
          : baseInstallment;

      rows.push({
        description:
          qty === 1
            ? `Parcela Única - ${courseTitle}`
            : `Parcela ${i}/${qty} - ${courseTitle}`,
        amount: amount.toFixed(2),
        due_date: addMonthsToIsoDate(firstDue, i - 1),
        payment_method: params.paymentMethod || 'pix',
        installment_type: 'tuition',
        installment_index: i,
      });
    }

    return rows;
  }
}

/**
 * 4. Estratégia: Taxa de Matrícula Separada + Parcelas do Curso
 */
export class SeparateFeeInstallmentStrategy implements InstallmentCalculationStrategy {
  readonly key: BillingStrategyKey = 'separate_fee';
  readonly label = 'Taxa Separada + Parcelas';
  readonly shortDescription = 'Cobra a Taxa de Matrícula em uma fatura separada e divide o valor do curso nas demais parcelas.';

  calculate(params: InstallmentStrategyParams): InstallmentDraftRow[] {
    const total = Math.max(0, Number(params.total.toFixed(2)));
    const inscricao = Math.max(0, Number(params.inscricao.toFixed(2)));
    if (total <= 0 && inscricao <= 0) return [];

    const firstDue = params.firstDueDate || getDefaultDueDateIso(5);
    const feeDue = params.feeDueDate || firstDue;
    const courseTitle = params.courseTitle || 'Curso';
    const feeMethod = params.feePaymentMethod || params.paymentMethod || 'pix';
    const offsetAfterFee = params.offsetCourseAfterFee ?? true;

    const rows: InstallmentDraftRow[] = [];

    if (inscricao > 0) {
      rows.push({
        description: `Taxa de Matrícula - ${courseTitle}`,
        amount: inscricao.toFixed(2),
        due_date: feeDue,
        payment_method: feeMethod,
        installment_type: 'enrollment_fee',
        installment_index: 0,
      });
    }

    const tuitionTotal = Math.max(0, Number((total - inscricao).toFixed(2)));
    if (tuitionTotal <= 0) return rows;

    const qty = Math.max(1, Math.min(48, Math.floor(params.parcelas || 1)));
    const baseInstallment = Math.floor((tuitionTotal / qty) * 100) / 100;

    for (let i = 1; i <= qty; i++) {
      const amount =
        i === qty
          ? Number((tuitionTotal - baseInstallment * (qty - 1)).toFixed(2))
          : baseInstallment;

      const monthOffset = i - 1 + (inscricao > 0 && offsetAfterFee ? 1 : 0);

      rows.push({
        description: `Parcela ${i}/${qty} - ${courseTitle}`,
        amount: amount.toFixed(2),
        due_date: addMonthsToIsoDate(firstDue, monthOffset),
        payment_method: params.paymentMethod || 'pix',
        installment_type: 'tuition',
        installment_index: i,
      });
    }

    return rows;
  }
}

/**
 * 5. Estratégia: Apenas Taxa de Matrícula Agora (Reserva / Interessado)
 */
export class OnlyEnrollmentFeeStrategy implements InstallmentCalculationStrategy {
  readonly key: BillingStrategyKey = 'only_fee';
  readonly label = 'Só Taxa de Matrícula Agora';
  readonly shortDescription = 'Gera apenas a cobrança da Taxa de Matrícula agora (ideal para reservar vaga de interessado).';

  calculate(params: InstallmentStrategyParams): InstallmentDraftRow[] {
    const inscricao = Math.max(0, Number(params.inscricao.toFixed(2)));
    if (inscricao <= 0) return [];

    const due = params.feeDueDate || params.firstDueDate || getDefaultDueDateIso(3);
    const courseTitle = params.courseTitle || 'Curso';

    return [
      {
        description: `Taxa de Matrícula - ${courseTitle}`,
        amount: inscricao.toFixed(2),
        due_date: due,
        payment_method: params.feePaymentMethod || params.paymentMethod || 'pix',
        installment_type: 'enrollment_fee',
        installment_index: 0,
      },
    ];
  }
}

/**
 * Registry / Factory de Estratégias no Frontend
 */
export class InstallmentStrategyRegistry {
  private static strategies: Record<BillingStrategyKey, InstallmentCalculationStrategy> = {
    none: new SimulationOnlyStrategy(),
    single: new SinglePaymentStrategy(),
    bundled: new BundledInstallmentStrategy(),
    separate_fee: new SeparateFeeInstallmentStrategy(),
    only_fee: new OnlyEnrollmentFeeStrategy(),
  };

  static get(key?: string | null): InstallmentCalculationStrategy {
    const normalized = (key || 'bundled') as BillingStrategyKey;
    return this.strategies[normalized] || this.strategies.bundled;
  }

  static getAll(): InstallmentCalculationStrategy[] {
    return Object.values(this.strategies);
  }

  /**
   * Redistribui automaticamente a diferença de valor entre as parcelas editáveis
   * quando o usuário altera manualmente o valor de uma parcela (ex.: entrada maior).
   */
  static redistributeRemainingBalance(
    rows: InstallmentDraftRow[],
    targetTotal: number,
    lockedIndices: Set<number>
  ): InstallmentDraftRow[] {
    if (!rows.length || targetTotal <= 0) return rows;

    let lockedSum = 0;
    const unlockedIndices: number[] = [];

    rows.forEach((row, idx) => {
      const isPaid = row.status === 'paid';
      if (isPaid || lockedIndices.has(idx)) {
        lockedSum += Number(row.amount) || 0;
      } else {
        unlockedIndices.push(idx);
      }
    });

    if (unlockedIndices.length === 0) return rows;

    const remainingToDistribute = Math.max(0, Number((targetTotal - lockedSum).toFixed(2)));
    const qty = unlockedIndices.length;
    const perRow = Math.floor((remainingToDistribute / qty) * 100) / 100;

    return rows.map((row, idx) => {
      const posInUnlocked = unlockedIndices.indexOf(idx);
      if (posInUnlocked === -1) return row;

      const isLastUnlocked = posInUnlocked === qty - 1;
      const newAmount = isLastUnlocked
        ? Number((remainingToDistribute - perRow * (qty - 1)).toFixed(2))
        : perRow;

      return {
        ...row,
        amount: Math.max(0, newAmount).toFixed(2),
      };
    });
  }
}

