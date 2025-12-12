import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { currencyRemoveMaskToNumber, currencyApplyMask } from '@/lib/masks/currency';

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
    <Card className="mt-4">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Chips resumindo os valores da linha ativa */}
        <div className="flex flex-wrap gap-2">
          <span className="inline-flex items-center rounded-md bg-muted px-2 py-1 text-xs">
            Total de Parcelas: {activeRow?.parcela || '-'}
          </span>
          <span className="inline-flex items-center rounded-md bg-muted px-2 py-1 text-xs">
            Valor da Parcela: {activeRow?.valor || '-'}
          </span>
          <span className="inline-flex items-center rounded-md bg-muted px-2 py-1 text-xs">
            Desconto Pontualidade: {activeRow?.desconto || '-'}
          </span>
          <span className="inline-flex items-center rounded-md bg-muted px-2 py-1 text-xs">
            Parcela c/ Desconto: {activeRow?.parcelaComDesconto || '-'}
          </span>
        </div>

        {/* Render do texto com shortcodes aplicados */}
        <div className="prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: discountPreviewHtml }} />
      </CardContent>
    </Card>
  );
}