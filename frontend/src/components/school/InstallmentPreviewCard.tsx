import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { currencyRemoveMaskToNumber, currencyApplyMask } from '@/lib/masks/currency';
import { CreditCard, Info } from 'lucide-react';

export type InstallmentLine = { parcela?: string; parcelas?: string; valor?: string | number; desconto?: string | number };
export type ParcelamentoData = { linhas?: InstallmentLine[]; texto_desconto?: string };

interface InstallmentPreviewCardProps {
  /**
   * title
   * pt-BR: Título do card.
   * en-US: Card title.
   */
  title?: string;
  /**
   * parcelamento
   * pt-BR: Objeto com linhas e texto de desconto para resolver shortcodes.
   * en-US: Object with lines and discount text to resolve shortcodes.
   */
  parcelamento?: ParcelamentoData | null;
}

/**
 * InstallmentPreviewCard
 * pt-BR: Card de preview que resolve shortcodes usando a linha ativa salva em `orc.parcelamento.linhas`.
 *        Mostra chips com Total de Parcelas, Valor, Desconto e Parcela com Desconto, e renderiza o texto resolvido.
 * en-US: Preview card that resolves shortcodes using the active saved line in `orc.parcelamento.linhas`.
 *        Shows chips for Total Installments, Value, Discount, and Installment With Discount, and renders the resolved text.
 */
export default function InstallmentPreviewCard({ title = 'Parcelamento', parcelamento }: InstallmentPreviewCardProps) {
  /**
   * formatCurrencyBRL
   * pt-BR: Formata número em BRL.
   * en-US: Formats number as BRL.
   */
  function formatCurrencyBRL(value: number): string {
    try {
      return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(value) || 0);
    } catch {
      return `R$ ${(Number(value) || 0).toFixed(2)}`;
    }
  }

  /**
   * resolveShortcodes
   * pt-BR: Substitui shortcodes no HTML com valores da linha ativa.
   * en-US: Replaces shortcodes in HTML with values from the active line.
   */
  function resolveShortcodes(baseHtml: string, row: { parcela?: string; valor?: string; desconto?: string; parcelaComDesconto?: string } | null): string {
    const html = String(baseHtml || '');
    if (!row) return html;
    const totalParcStr = String(row.parcela || '');
    const valorParcelaStr = String(row.valor || '');
    const descPontualStr = String(row.desconto || '');
    const parcelaComDescStr = String(row.parcelaComDesconto || '');
    return html
      .replace(/\{total_parcelas\}/gi, totalParcStr)
      .replace(/\{valor_parcela\}/gi, valorParcelaStr)
      .replace(/\{desconto_pontualidade\}/gi, descPontualStr)
      .replace(/\{parcela_com_desconto\}/gi, parcelaComDescStr);
  }

  /**
   * activeRow
   * pt-BR: Usa a primeira linha salva em `orc.parcelamento.linhas` como linha ativa.
   * en-US: Uses the first saved line in `orc.parcelamento.linhas` as the active row.
   */
  const activeRow = useMemo(() => {
    const linhas = Array.isArray(parcelamento?.linhas) ? parcelamento!.linhas! : [];
    const raw = linhas[0] || null;
    if (!raw) return null;
    const parcelaStr = String(raw.parcela ?? raw.parcelas ?? '');
    const valorMasked = String(
      typeof raw.valor === 'number' ? formatCurrencyBRL(Number(raw.valor)) : raw.valor ? currencyApplyMask(String(raw.valor), 'pt-BR', 'BRL') : ''
    );
    const descontoMasked = String(
      typeof raw.desconto === 'number' ? formatCurrencyBRL(Number(raw.desconto)) : raw.desconto ? currencyApplyMask(String(raw.desconto), 'pt-BR', 'BRL') : ''
    );
    const valorNum = currencyRemoveMaskToNumber(valorMasked) || 0;
    const descontoNum = currencyRemoveMaskToNumber(descontoMasked) || 0;
    const parcelaComDescNum = valorNum > 0 ? Math.max(valorNum - descontoNum, 0) : 0;
    const parcelaComDescMasked = parcelaComDescNum > 0 ? formatCurrencyBRL(parcelaComDescNum) : '';
    return { parcela: parcelaStr, valor: valorMasked, desconto: descontoMasked, parcelaComDesconto: parcelaComDescMasked };
  }, [parcelamento]);

  /**
   * discountPreviewHtml
   * pt-BR: HTML do texto de desconto com shortcodes resolvidos.
   * en-US: Discount text HTML with resolved shortcodes.
   */
  const discountPreviewHtml = useMemo(() => {
    const base = String(parcelamento?.texto_desconto || '');
    return resolveShortcodes(base, activeRow);
  }, [parcelamento, activeRow]);

  return (
    <Card className="border shadow-sm overflow-hidden bg-white/50 backdrop-blur-sm">
      <CardHeader className="bg-muted/30 border-b py-4">
        <CardTitle className="text-lg font-bold flex items-center gap-2">
          <CreditCard className="h-5 w-5 text-primary/70" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6 md:p-8 space-y-6">
        {/* Chips resumindo os valores da linha ativa */}
        <div className="flex flex-wrap gap-3">
          <div className="flex flex-col px-4 py-2 rounded-2xl bg-muted/40 border border-muted/20">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/80">Parcelas</span>
            <span className="text-base font-black text-foreground/70">{activeRow?.parcela || '-'}</span>
          </div>
          <div className="flex flex-col px-4 py-2 rounded-2xl bg-muted/40 border border-muted/20">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/80">Valor/Parc</span>
            <span className="text-base font-black text-foreground/70">{activeRow?.valor || '-'}</span>
          </div>
          <div className="flex flex-col px-4 py-2 rounded-2xl bg-red-50/50 border border-red-100/50">
            <span className="text-[10px] font-bold uppercase tracking-wider text-red-600/70">Desconto</span>
            <span className="text-base font-black text-red-600/80">{activeRow?.desconto || '-'}</span>
          </div>
          <div className="flex flex-col px-4 py-2 rounded-2xl bg-emerald-50/50 border border-emerald-100/50">
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600/70">C/ Desconto</span>
            <span className="text-base font-black text-emerald-700">{activeRow?.parcelaComDesconto || '-'}</span>
          </div>
        </div>

        {/* Render do texto com shortcodes aplicados */}
        <div className="p-6 rounded-2xl bg-white border shadow-inner">
          <div className="flex items-start gap-4">
            <div className="mt-1 h-8 w-8 rounded-full bg-primary/5 flex items-center justify-center shrink-0">
              <Info className="h-4 w-4 text-primary/40" />
            </div>
            <div className="prose prose-sm max-w-none text-foreground/80 leading-relaxed font-medium" dangerouslySetInnerHTML={{ __html: discountPreviewHtml }} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}