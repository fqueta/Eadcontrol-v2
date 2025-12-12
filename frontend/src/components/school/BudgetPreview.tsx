import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { CourseRecord, CourseModule } from '@/types/courses';

/**
 * BudgetPreview
 * pt-BR: Componente de visualização de orçamento. Exibe cabeçalho com dados do cliente
 *        e uma tabela detalhando itens, descontos, subtotal e total.
 * en-US: Budget preview component. Shows client header and a table detailing items,
 *        discounts, subtotal, and total.
 */
export default function BudgetPreview({
  title = 'Proposta Comercial',
  clientName,
  clientId,
  clientPhone,
  clientEmail,
  validityDate,
  course,
  module,
  discountLabel = 'Desconto',
  discountAmountMasked,
  subtotalMasked,
  totalMasked,
}: {
  title?: string;
  clientName: string;
  clientId?: string | number;
  clientPhone?: string;
  clientEmail?: string;
  validityDate?: string;
  course?: CourseRecord | any;
  module?: CourseModule | any;
  discountLabel?: string;
  discountAmountMasked?: string; // already masked (e.g. "R$ 6.000,00")
  subtotalMasked?: string; // already masked
  totalMasked?: string; // already masked
}) {
  // Helpers
  const moduleTitle = module?.titulo || (course?.titulo || course?.nome || '');
  const etapa = module?.etapa || '';
  console.log('module', module);
  /**
   * parseToNumber
   * pt-BR: Converte valores numéricos vindos como string/number para número seguro.
   * en-US: Converts numeric values coming as string/number into a safe number.
   */
  const parseToNumber = (v: unknown): number => {
    if (typeof v === 'number') return Number.isFinite(v) ? v : 0;
    const s = String(v ?? '').trim();
    if (!s) return 0;
    const n = Number(s.replace(/\./g, '').replace(',', '.'));
    return Number.isFinite(n) ? n : 0;
  };
  // Horas mapeadas pelo módulo: limite = teóricas, limite_pratico = práticas
  const horasTeoricas = parseToNumber(module?.limite);
  const horasPraticas = parseToNumber(module?.limite_pratico);
  const valorItemMasked = (() => {
    const v = module?.valor || course?.valor || '';
    if (typeof v === 'string' && v.trim().length > 0) {
      // Se já vier mascarado (ex.: "23.820,00"), prefixa "R$ " para feedback.
      return v.startsWith('R$') ? v : `R$ ${v}`;
    }
    return subtotalMasked || 'R$ 0,00';
  })();

  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {/* Cabeçalho com dados do cliente */}
        <div className="space-y-1 text-sm mb-4">
          {clientName && (
            <div>
              <span className="font-medium">Cliente:</span>{' '}
              <span className='font-bold'>{clientName}</span>{' '}
              {clientId && (
                <span className="text-muted-foreground">zapsint Nº: {String(clientId)}</span>
              )}
            </div>
          )}
          {clientPhone && (
            <div>
              <span className="font-medium">Telefone:</span>{' '}
              <span className='font-bold'>{clientPhone}</span>
            </div>
          )}
          {clientEmail && (
            <div>
              <span className="font-medium">Email:</span>{' '}
              <span className='font-bold'>{clientEmail}</span>
            </div>
          )}
          <div className="flex gap-4">
            <div>
              <span className="font-medium">Data:</span>{' '}
              <span className='font-bold'>{new Date().toLocaleDateString('pt-BR')}</span>
            </div>
            <div>
              <span className="font-medium">Validade:</span>{' '}
              <span className='font-bold'>{validityDate || '—'}</span>
            </div>
          </div>
        </div>

        {/* Tabela de detalhamento */}
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Descrição</TableHead>
              <TableHead>Etapa</TableHead>
              <TableHead>H. Teóricas</TableHead>
              <TableHead>H. Práticas</TableHead>
              <TableHead className="text-right">Valor</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell>{moduleTitle}</TableCell>
              <TableCell>{etapa || '—'}</TableCell>
              <TableCell>{horasTeoricas}</TableCell>
              <TableCell>{horasPraticas}</TableCell>
              <TableCell className="text-right">{valorItemMasked}</TableCell>
            </TableRow>

            {/* Linha de desconto */}
            {discountAmountMasked && (
              <TableRow>
                <TableCell colSpan={4}>
                  <span className="text-red-600 font-medium">{discountLabel}</span>
                </TableCell>
                <TableCell className="text-right text-red-600">- {discountAmountMasked}</TableCell>
              </TableRow>
            )}

            {/* Subtotal */}
            {subtotalMasked && (
              <TableRow>
                <TableCell colSpan={4} className="font-medium">Subtotal</TableCell>
                <TableCell className="text-right font-medium">{subtotalMasked}</TableCell>
              </TableRow>
            )}

            {/* Total do orçamento */}
            {totalMasked && (
              <TableRow>
                <TableCell colSpan={4} className="font-semibold">Total do Orçamento</TableCell>
                <TableCell className="text-right font-semibold">{totalMasked}</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}