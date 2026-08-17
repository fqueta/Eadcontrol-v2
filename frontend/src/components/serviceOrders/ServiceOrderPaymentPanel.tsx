import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Banknote,
  CreditCard,
  QrCode,
  FileText,
  Landmark,
  Wallet,
  Printer,
  Loader2,
  Copy,
  ExternalLink,
  Undo2,
  CheckCircle2,
  type LucideIcon,
} from "lucide-react";
import { financialService } from "@/services/financialService";
import {
  AccountReceivable,
  AccountStatus,
  PaymentMethod,
} from "@/types/financial";
import { SERVICE_ORDER_STATUSES } from "@/types/serviceOrders";
import { currencyApplyMask, currencyRemoveMaskToNumber } from "@/lib/masks/currency";

type MethodId =
  | 'cash'
  | 'credit_card'
  | 'debit_card'
  | 'pix'
  | 'boleto'
  | 'bank_transfer'
  | 'check'
  | 'other';

interface MethodDef {
  id: MethodId;
  label: string;
  icon: LucideIcon;
  paymentMethod: PaymentMethod;
  kind: 'instant' | 'scheduled' | 'online';
  billingType?: 'PIX' | 'BOLETO';
  installments?: boolean;
  dueDate?: boolean;
}

const METHODS: MethodDef[] = [
  { id: 'cash', label: 'Dinheiro', icon: Banknote, paymentMethod: PaymentMethod.CASH, kind: 'instant' },
  { id: 'credit_card', label: 'Cartão de Crédito', icon: CreditCard, paymentMethod: PaymentMethod.CREDIT_CARD, kind: 'instant', installments: true },
  { id: 'debit_card', label: 'Cartão de Débito', icon: CreditCard, paymentMethod: PaymentMethod.DEBIT_CARD, kind: 'instant' },
  { id: 'pix', label: 'Pix', icon: QrCode, paymentMethod: PaymentMethod.PIX, kind: 'online', billingType: 'PIX' },
  { id: 'boleto', label: 'Boleto', icon: FileText, paymentMethod: PaymentMethod.BANK_TRANSFER, kind: 'online', billingType: 'BOLETO', installments: true, dueDate: true },
  { id: 'bank_transfer', label: 'Transferência / Depósito', icon: Landmark, paymentMethod: PaymentMethod.BANK_TRANSFER, kind: 'scheduled', dueDate: true },
  { id: 'check', label: 'Cheque', icon: FileText, paymentMethod: PaymentMethod.CHECK, kind: 'instant' },
  { id: 'other', label: 'Ticket / Outro', icon: Wallet, paymentMethod: PaymentMethod.OTHER, kind: 'instant' },
];

interface PaymentLine {
  amount: string;
  installments: string;
  dueDate: string;
}

interface ReceiptLine {
  label: string;
  amount: number;
  installments: number;
  paid: boolean;
}

interface ReceiptData {
  lines: ReceiptLine[];
  totalPaid: number;
  restante: number;
  troco: number;
  clientName: string;
  osId: string;
  date: string;
}

interface OnlineCharge {
  label: string;
  amount: number;
  invoiceUrl?: string | null;
  pix?: { encodedImage?: string; payload?: string } | null;
}

const INSTITUTION = () =>
  (window as any).__APP_INSTITUTION_NAME__ || 'Salão';

const toDateStr = (d: Date): string => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

const todayStr = (): string => toDateStr(new Date());

const addMonths = (d: Date, months: number): Date => {
  const r = new Date(d);
  r.setMonth(r.getMonth() + months);
  return r;
};

const round2 = (v: number): number => Math.round(v * 100) / 100;

const fmtMoney = (v: number): string =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);

const fmtDate = (dateStr: string): string => {
  if (!dateStr) return '-';
  const [y, m, d] = dateStr.split('-');
  if (!y || !m || !d) return dateStr;
  return `${d}/${m}/${y}`;
};

const makeDefaultLines = (): Record<MethodId, PaymentLine> => {
  const base = {} as Record<MethodId, PaymentLine>;
  METHODS.forEach((m) => {
    base[m.id] = { amount: '', installments: '1', dueDate: todayStr() };
  });
  return base;
};

interface ServiceOrderPaymentPanelProps {
  serviceOrder: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAccountsChanged?: () => void;
}

export function ServiceOrderPaymentDialog({
  serviceOrder,
  open,
  onOpenChange,
  onAccountsChanged,
}: ServiceOrderPaymentPanelProps) {
  const osId = String(serviceOrder?.id || '');
  const clientId = serviceOrder?.client_id;
  const total = Number(serviceOrder?.total_amount || 0);
  const statusLabel =
    SERVICE_ORDER_STATUSES.find((s) => s.value === serviceOrder?.status)?.label ||
    serviceOrder?.status ||
    '-';

  const [lines, setLines] = useState<Record<MethodId, PaymentLine>>(makeDefaultLines);
  const [accounts, setAccounts] = useState<AccountReceivable[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [receipt, setReceipt] = useState<ReceiptData | null>(null);
  const [onlineCharges, setOnlineCharges] = useState<OnlineCharge[]>([]);

  const loadAccounts = useCallback(async () => {
    setIsLoading(true);
    try {
      const res: any = await financialService.accountsReceivable.getAll({
        service_order_id: osId,
        per_page: 100,
      });
      setAccounts(res?.data || []);
    } catch (error) {
      console.error('Erro ao carregar contas da ordem:', error);
      setAccounts([]);
    } finally {
      setIsLoading(false);
    }
  }, [osId]);

  useEffect(() => {
    if (open) loadAccounts();
  }, [open, loadAccounts]);

  const paidAmount = useMemo(
    () =>
      accounts
        .filter((a) => a.status === AccountStatus.PAID)
        .reduce((s, a) => s + Number(a.amount || 0), 0),
    [accounts]
  );

  const totalDue = Math.max(0, total - paidAmount);

  const typedAmount = useMemo(
    () => METHODS.reduce((s, m) => s + currencyRemoveMaskToNumber(lines[m.id].amount), 0),
    [lines]
  );

  const restante = Math.max(0, totalDue - typedAmount);
  const troco = Math.max(0, typedAmount - totalDue);

  const setLine = (id: MethodId, patch: Partial<PaymentLine>) => {
    setLines((prev) => ({ ...prev, [id]: { ...prev[id], ...patch } }));
  };

  const createAccount = async (
    method: MethodDef,
    amount: number,
    due: Date,
    index: number,
    installments: number
  ): Promise<AccountReceivable> => {
    const res: any = await financialService.accountsReceivable.create({
      description: `Pagamento OS #${osId} - ${method.label}`,
      amount: round2(amount),
      dueDate: toDateStr(due),
      clientId,
      serviceOrderId: osId,
      paymentMethod: method.paymentMethod,
      installments,
      recurrence: installments > 1 ? 'monthly' : 'none',
      invoiceNumber: `OS-${osId}-${index}`,
    });
    return res.data;
  };

  const handleRegister = async () => {
    const entries = METHODS
      .map((m) => ({ method: m, value: currencyRemoveMaskToNumber(lines[m.id].amount) }))
      .filter((e) => e.value > 0);

    if (entries.length === 0) {
      toast.error('Informe ao menos um valor de pagamento.');
      return;
    }

    const sum = entries.reduce((s, e) => s + e.value, 0);
    if (sum > totalDue + 0.001) {
      toast.error(
        `O valor informado (${fmtMoney(sum)}) excede o restante à pagar (${fmtMoney(totalDue)}).`
      );
      return;
    }

    const processedLines: ReceiptLine[] = [];
    const charges: OnlineCharge[] = [];

    setIsSubmitting(true);
    try {
      for (const entry of entries) {
        const { method, value } = entry;
        const installments = method.installments
          ? Math.max(1, parseInt(lines[method.id].installments) || 1)
          : 1;
        const dueDate = method.dueDate && lines[method.id].dueDate
          ? lines[method.id].dueDate
          : todayStr();
        const baseDate = method.kind === 'scheduled' ? new Date(dueDate) : new Date(todayStr());

        if (method.kind === 'online') {
          if (method.billingType === 'BOLETO' && installments > 1) {
            const firstDue = new Date(dueDate);
            const base = round2(value / installments);
            for (let i = 1; i <= installments; i++) {
              const amount = i === installments ? round2(value - base * (installments - 1)) : base;
              const account = await createAccount(method, amount, addMonths(firstDue, i - 1), i, installments);
              const chargeRes: any = await financialService.accountsReceivable.generateCharge(account.id, 'BOLETO');
              const charged = chargeRes.data;
              charges.push({
                label: `${method.label} ${i}x de ${fmtMoney(amount)}`,
                amount,
                invoiceUrl: charged?.config?.invoice_url || null,
              });
            }
          } else {
            const account = await createAccount(method, value, new Date(dueDate), 1, installments);
            const chargeRes: any = await financialService.accountsReceivable.generateCharge(
              account.id,
              method.billingType || 'BOLETO'
            );
            const charged = chargeRes.data;
            charges.push({
              label: `${method.label} · ${fmtMoney(value)}`,
              amount: value,
              invoiceUrl: charged?.config?.invoice_url || null,
              pix: charged?.config?.pix || null,
            });
          }
          processedLines.push({ label: method.label, amount: value, installments, paid: false });
        } else {
          const created: AccountReceivable[] = [];
          if (method.installments && installments > 1) {
            const base = round2(value / installments);
            for (let i = 1; i <= installments; i++) {
              const amount = i === installments ? round2(value - base * (installments - 1)) : base;
              created.push(await createAccount(method, amount, addMonths(baseDate, i - 1), i, installments));
            }
          } else {
            created.push(await createAccount(method, value, baseDate, 1, 1));
          }

          if (method.kind === 'instant') {
            for (const acct of created) {
              await financialService.accountsReceivable.markAsReceived(
                acct.id,
                todayStr(),
                method.paymentMethod
              );
            }
          }
          processedLines.push({
            label: method.label,
            amount: value,
            installments,
            paid: method.kind === 'instant',
          });
        }
      }
    } catch (error: any) {
      console.error('Erro ao registrar pagamento:', error);
      if (error?.response?.status === 403) {
        toast.error('Sem permissão para criar contas financeiras. Verifique as permissões do módulo de contas.');
      } else {
        const msg =
          error?.response?.data?.message ||
          error?.response?.data?.errors?.[0] ||
          error?.message ||
          'Erro ao registrar pagamento.';
        toast.error(typeof msg === 'string' ? msg : 'Erro ao registrar pagamento.');
      }
      setIsSubmitting(false);
      await loadAccounts();
      return;
    }

    setIsSubmitting(false);
    await loadAccounts();
    onAccountsChanged?.();

    const totalPaid = processedLines.reduce((s, l) => s + l.amount, 0);
    setReceipt({
      lines: processedLines,
      totalPaid,
      restante: Math.max(0, totalDue - sum),
      troco,
      clientName: serviceOrder?.client?.name || serviceOrder?.client_name || '-',
      osId,
      date: todayStr(),
    });
    if (charges.length > 0) {
      setOnlineCharges(charges);
    }
    setLines(makeDefaultLines());
    toast.success('Pagamento registrado com sucesso!');
  };

  const handleUndo = async () => {
    const target = accounts.filter((a) => a.status !== AccountStatus.CANCELLED);
    if (target.length === 0) {
      toast.info('Nenhuma conta a desfazer.');
      return;
    }
    if (!confirm(`Desfazer pagamento? Serão canceladas ${target.length} conta(s) desta ordem.`)) {
      return;
    }
    let ok = 0;
    for (const a of target) {
      try {
        await financialService.accountsReceivable.cancel(a.id);
        ok++;
      } catch (e) {
        console.error(`Erro ao cancelar conta ${a.id}:`, e);
      }
    }
    if (ok > 0) toast.success(`${ok} conta(s) cancelada(s).`);
    else toast.error('Não foi possível cancelar as contas.');
    await loadAccounts();
    onAccountsChanged?.();
  };

  const printReceipt = () => {
    if (!receipt) return;
    const w = window.open('', '_blank', 'width=420,height=640');
    if (!w) {
      toast.error('Permita pop-ups para imprimir o recibo.');
      return;
    }
    const linesHtml = receipt.lines
      .map(
        (l) =>
          `<tr><td>${l.label}${l.installments > 1 ? ` (${l.installments}x)` : ''}${l.paid ? ' - PAGO' : ''}</td><td style="text-align:right">${fmtMoney(l.amount)}</td></tr>`
      )
      .join('');
    const trocoHtml =
      receipt.troco > 0
        ? `<tr><td>Troco</td><td style="text-align:right">${fmtMoney(receipt.troco)}</td></tr>`
        : '';
    w.document.write(`<!DOCTYPE html><html lang="pt-BR"><head><meta charset="utf-8"><title>Recibo de Pagamento</title>
<style>
  body { font-family: monospace; width: 80mm; margin: 8px auto; color: #111; font-size: 12px; }
  h1 { font-size: 15px; margin: 0; text-align: center; }
  .center { text-align: center; }
  table { width: 100%; border-collapse: collapse; }
  .sep { border-top: 1px dashed #111; }
  .sig { display: flex; justify-content: space-between; margin-top: 40px; }
  .sig div { width: 48%; border-top: 1px solid #111; text-align: center; padding-top: 4px; font-size: 10px; }
</style></head><body>
  <h1>${INSTITUTION()}</h1>
  <p class="center" style="margin: 2px 0 8px;">RECIBO DE PAGAMENTO</p>
  <p>OS: <b>#${receipt.osId}</b></p>
  <p>Data: ${fmtDate(receipt.date)}</p>
  <p>Cliente: <b>${receipt.clientName}</b></p>
  <table style="margin-top: 6px;">${linesHtml}
    <tr class="sep"><td><b>Total pago</b></td><td style="text-align:right"><b>${fmtMoney(receipt.totalPaid)}</b></td></tr>
    <tr><td>Restante à pagar</td><td style="text-align:right">${fmtMoney(receipt.restante)}</td></tr>
    ${trocoHtml}
  </table>
  <div class="sig"><div>Cliente</div><div>${INSTITUTION()}</div></div>
</body></html>`);
    w.document.close();
    w.focus();
    setTimeout(() => w.print(), 250);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-3xl max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Banknote className="h-5 w-5" /> Pagamento / Checkout
            </DialogTitle>
            <DialogDescription>
              Registre o recebimento vinculado a esta ordem. Cada pagamento gera uma conta em Contas a Receber.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6">
          {/* Resumo */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="rounded-lg border bg-slate-50 p-3">
              <p className="text-xs text-slate-500">Pedido / Status</p>
              <p className="text-sm font-semibold">OS #{osId.slice(-8).toUpperCase()}</p>
              <p className="text-xs text-slate-500 mt-0.5">{statusLabel}</p>
            </div>
            <div className="rounded-lg border bg-slate-50 p-3">
              <p className="text-xs text-slate-500">Valor total</p>
              <p className="text-base font-bold text-green-700">{fmtMoney(total)}</p>
            </div>
            <div className="rounded-lg border bg-slate-50 p-3">
              <p className="text-xs text-slate-500">Valor pago</p>
              <p className="text-base font-bold text-blue-700">{fmtMoney(paidAmount)}</p>
            </div>
            <div className="rounded-lg border bg-slate-50 p-3">
              <p className="text-xs text-slate-500">Restante à pagar</p>
              <p className="text-base font-bold text-red-600">{fmtMoney(restante)}</p>
              {troco > 0 && (
                <p className="text-xs font-semibold text-orange-600 mt-0.5">Troco: {fmtMoney(troco)}</p>
              )}
            </div>
          </div>

          {/* Formas de pagamento */}
          <div>
            <h3 className="text-sm font-medium mb-2">Formas de Pagamento</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {METHODS.map((m) => {
                const Icon = m.icon;
                const line = lines[m.id];
                return (
                  <div key={m.id} className="rounded-lg border p-3 space-y-2">
                    <div className="flex items-center gap-2">
                      <Icon className="h-4 w-4 text-muted-foreground" />
                      <Label className="font-medium">{m.label}</Label>
                    </div>
                    <div className="flex flex-wrap items-end gap-2">
                      <div className="flex-1 min-w-[120px]">
                        <Input
                          type="text"
                          inputMode="decimal"
                          placeholder="R$ 0,00"
                          value={line.amount ? currencyApplyMask(line.amount, 'pt-BR', 'BRL') : ''}
                          onChange={(e) => setLine(m.id, { amount: e.target.value })}
                          disabled={isSubmitting}
                        />
                      </div>
                      {m.installments && (
                        <div>
                          <Label className="text-xs">Parcelas</Label>
                          <Select
                            value={line.installments}
                            onValueChange={(v) => setLine(m.id, { installments: v })}
                            disabled={isSubmitting}
                          >
                            <SelectTrigger className="w-24">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {Array.from({ length: 12 }, (_, i) => i + 1).map((n) => (
                                <SelectItem key={n} value={String(n)}>
                                  {n}x
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                      {m.dueDate && (
                        <div>
                          <Label className="text-xs">Vencimento</Label>
                          <Input
                            type="date"
                            className="w-[140px]"
                            value={line.dueDate}
                            onChange={(e) => setLine(m.id, { dueDate: e.target.value })}
                            disabled={isSubmitting}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Ações */}
          <div className="flex flex-wrap gap-2">
            <Button onClick={handleRegister} disabled={isSubmitting || totalDue <= 0}>
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <CheckCircle2 className="h-4 w-4 mr-2" />
              )}
              Registrar Pagamento
            </Button>
            <Button variant="outline" onClick={handleUndo} disabled={isLoading || accounts.length === 0}>
              <Undo2 className="h-4 w-4 mr-2" />
              Desfazer Pagamento
            </Button>
          </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Resultado de cobranças online (Pix / Boleto) */}
      <Dialog open={onlineCharges.length > 0} onOpenChange={(o) => !o && setOnlineCharges([])}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Cobrança Gerada</DialogTitle>
            <DialogDescription>
              Compartilhe com o cliente para realizar o pagamento.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 max-h-[60vh] overflow-y-auto">
            {onlineCharges.map((c, i) => (
              <div key={i} className="rounded-lg border p-4 space-y-3">
                <p className="text-sm font-medium">{c.label}</p>
                {c.pix?.encodedImage ? (
                  <>
                    <div className="flex justify-center bg-white rounded-lg p-2">
                      <img
                        src={`data:image/png;base64,${c.pix.encodedImage}`}
                        alt="QR Code PIX"
                        className="h-44 w-44"
                      />
                    </div>
                    {c.pix.payload && (
                      <div className="flex gap-2 items-start">
                        <code className="flex-1 text-xs break-all rounded bg-muted p-2">{c.pix.payload}</code>
                        <Button
                          size="sm"
                          variant="outline"
                          className="shrink-0"
                          onClick={() => navigator.clipboard.writeText(c.pix.payload!)}
                        >
                          <Copy className="h-3 w-3 mr-1" /> Copiar
                        </Button>
                      </div>
                    )}
                  </>
                ) : c.invoiceUrl ? (
                  <Button asChild size="sm" variant="outline">
                    <a href={c.invoiceUrl} target="_blank" rel="noreferrer">
                      <ExternalLink className="h-3 w-3 mr-1" /> Abrir fatura
                    </a>
                  </Button>
                ) : (
                  <p className="text-xs text-slate-500">
                    Cobrança gerada. Acesse em Contas a Receber para ver a fatura.
                  </p>
                )}
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Recibo de pagamento */}
      <Dialog open={!!receipt} onOpenChange={(o) => !o && setReceipt(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Printer className="h-4 w-4" /> Recibo de Pagamento
            </DialogTitle>
          </DialogHeader>
          {receipt && (
            <div className="rounded-lg border p-4 space-y-3 text-sm">
              <div className="text-center">
                <p className="font-bold">{INSTITUTION()}</p>
                <p className="text-xs text-slate-500">Recibo de Pagamento</p>
              </div>
              <div className="text-xs space-y-0.5">
                <p>
                  OS: <b>#{receipt.osId}</b> · Data: {fmtDate(receipt.date)}
                </p>
                <p>
                  Cliente: <b>{receipt.clientName}</b>
                </p>
              </div>
              <Separator />
              {receipt.lines.map((l, i) => (
                <div key={i} className="flex justify-between gap-2">
                  <span>
                    {l.label}
                    {l.installments > 1 ? ` (${l.installments}x)` : ''}
                    {l.paid ? ' · Pago' : ' · Pendente'}
                  </span>
                  <span className="font-medium whitespace-nowrap">{fmtMoney(l.amount)}</span>
                </div>
              ))}
              <Separator />
              <div className="flex justify-between font-bold">
                <span>Total pago</span>
                <span>{fmtMoney(receipt.totalPaid)}</span>
              </div>
              <div className="flex justify-between">
                <span>Restante à pagar</span>
                <span>{fmtMoney(receipt.restante)}</span>
              </div>
              {receipt.troco > 0 && (
                <div className="flex justify-between text-orange-600">
                  <span>Troco</span>
                  <span>{fmtMoney(receipt.troco)}</span>
                </div>
              )}
              <div className="grid grid-cols-2 gap-8 pt-8">
                <div className="text-center border-t border-gray-400 pt-1 text-xs">Cliente</div>
                <div className="text-center border-t border-gray-400 pt-1 text-xs">{INSTITUTION()}</div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setReceipt(null)}>
              Fechar
            </Button>
            <Button onClick={printReceipt}>
              <Printer className="h-4 w-4 mr-1" /> Imprimir Recibo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
