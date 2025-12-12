import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useEnrollment } from '@/hooks/enrollments';
import { useClientById } from '@/hooks/clients';
import { useQuery } from '@tanstack/react-query';
import { coursesService } from '@/services/coursesService';
import { currencyRemoveMaskToNumber } from '@/lib/masks/currency';
import BudgetPreview from '@/components/school/BudgetPreview';
import InstallmentPreviewCard from '@/components/school/InstallmentPreviewCard';

interface ProposalViewContentProps {
  /**
   * id
   * pt-BR: ID da matrícula/proposta para carregar dados.
   * en-US: Enrollment/Proposal ID to load data.
   */
  id: string;
}

/**
 * ProposalViewContent
 * pt-BR: Componente de visualização de proposta somente leitura, com card de Proposta Comercial e Parcelamento.
 * en-US: Read-only proposal view component, with Commercial Proposal card and Installment preview.
 */
export default function ProposalViewContent({ id }: ProposalViewContentProps) {
  const { data: enrollment } = useEnrollment(String(id || ''));

  const clientId = useMemo(() => {
    const v = (enrollment as any)?.id_cliente ?? (enrollment as any)?.client_id;
    return v ? String(v) : '';
  }, [enrollment]);
  const { data: client } = useClientById(clientId, { enabled: !!clientId });

  const courseId = useMemo(() => {
    const v = (enrollment as any)?.id_curso ?? (enrollment as any)?.course_id;
    return v ? Number(v) : undefined;
  }, [enrollment]);
  const { data: course } = useQuery({
    queryKey: ['courses', 'byId', courseId],
    queryFn: async () => (courseId ? coursesService.getById(courseId) : null),
    enabled: !!courseId,
    staleTime: 5 * 60 * 1000,
  });

  /**
   * computeValidityDate
   * pt-BR: Soma N dias à data atual e formata dd/MM/yyyy.
   * en-US: Adds N days to today and formats dd/MM/yyyy.
   */
  function computeValidityDate(daysStr?: string): string {
    const days = parseInt(String(daysStr ?? ''), 10);
    if (!Number.isFinite(days) || days <= 0) return '';
    const d = new Date();
    d.setDate(d.getDate() + days);
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = d.getFullYear();
    return `${dd}/${mm}/${yyyy}`;
  }

  /**
   * formatCurrencyBRL
   * pt-BR: Formata número em BRL (R$).
   * en-US: Formats number into BRL (R$).
   */
  function formatCurrencyBRL(value: number): string {
    try {
      return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(value) || 0);
    } catch {
      return `R$ ${(Number(value) || 0).toFixed(2)}`;
    }
  }

  /**
   * maskMonetaryDisplay
   * pt-BR: Aplica máscara monetária para exibição; retorna vazio se não houver valor.
   * en-US: Applies monetary mask for display; returns empty when no value.
   */
  function maskMonetaryDisplay(raw: string | number | undefined | null): string {
    const s = String(raw ?? '').trim();
    if (!s) return '';
    const num = currencyRemoveMaskToNumber(s);
    return formatCurrencyBRL(num);
  }

  /**
   * computeModulo
   * pt-BR: Retorna módulo correto baseado no tipo de curso.
   * en-US: Returns proper module based on course type.
   */
  function computeModulo(enr: any, cursoTipo: string) {
    try {
      if (String(cursoTipo) === '4') {
        return enr?.orc?.modulos?.[0] ?? '';
      }
      return enr?.orc?.modulo ?? '';
    } catch {
      return '';
    }
  }

  const subtotalMasked = useMemo(() => maskMonetaryDisplay((enrollment as any)?.subtotal), [enrollment]);
  const totalMasked = useMemo(() => maskMonetaryDisplay((enrollment as any)?.total), [enrollment]);
  const descontoMasked = useMemo(() => maskMonetaryDisplay((enrollment as any)?.desconto), [enrollment]);
  const validadeDias = useMemo(() => String((enrollment as any)?.validade || '14'), [enrollment]);
  const clientName = client?.name || (client as any)?.nome || '';
  const clientPhone = client?.config?.celular || client?.config?.telefone_residencial || '';
  const clientEmail = client?.email || '';
  const curso_tipo = String((enrollment as any)?.curso_tipo || '');
  const modulo = computeModulo(enrollment as any, curso_tipo);

  const parcelamento = useMemo(() => {
    return ((enrollment as any)?.orc?.parcelamento ?? null) as any;
  }, [enrollment]);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          {/**
           * Header
           * pt-BR: Cabeçalho simples para a visualização da proposta.
           * en-US: Simple header for proposal view.
           */}
          <CardTitle>Visualizar Proposta</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <div className="font-medium">Cliente</div>
                <div>{clientName || '—'}</div>
              </div>
              <div>
                <div className="font-medium">Curso</div>
                <div>{(course as any)?.titulo || (course as any)?.nome || '—'}</div>
              </div>
              <div>
                <div className="font-medium">Subtotal</div>
                <div>{subtotalMasked || '—'}</div>
              </div>
              <div>
                <div className="font-medium">Total</div>
                <div>{totalMasked || '—'}</div>
              </div>
            </div>

            <BudgetPreview
              title="Proposta Comercial"
              clientName={clientName}
              clientId={client?.id ? String(client.id) : undefined}
              clientPhone={clientPhone}
              clientEmail={clientEmail}
              course={course as any}
              module={modulo}
              discountLabel="Desconto de Pontualidade"
              discountAmountMasked={descontoMasked}
              subtotalMasked={subtotalMasked}
              totalMasked={totalMasked}
              validityDate={computeValidityDate(validadeDias)}
            />

            {/* Card de Parcelamento abaixo do card de Proposta Comercial */}
            <InstallmentPreviewCard title="Parcelamento" parcelamento={parcelamento} />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}