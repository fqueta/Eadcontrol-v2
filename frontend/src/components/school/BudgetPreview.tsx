import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import type { CourseRecord, CourseModule } from '@/types/courses';
import { User, Phone, Mail, Calendar, Clock, ChevronRight, FileText, CheckCircle2, DollarSign, Printer, Download } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { downloadCommercialProposalPdf, printCommercialProposalPdf } from '@/lib/financial/generateCommercialProposalPdf';

/**
 * BudgetPreview
 * pt-BR: Componente de visualização de orçamento com suporte a impressão e download em PDF.
 * en-US: Budget preview component with print and PDF download support.
 */
export default function BudgetPreview({
  title = 'Proposta Comercial',
  description = 'Confira os detalhes da proposta comercial preparada especialmente para você.',
  proposalNumber,
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
  showClientInfo = true,
  showValidity = true,
  status = 'Aguardando Aprovação',
  installments,
  institutionName,
  notes,
  allowActions = true,
}: {
  title?: string;
  description?: string;
  proposalNumber?: string | number;
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
  showClientInfo?: boolean;
  showValidity?: boolean;
  status?: string;
  installments?: Array<{
    numero: number;
    descricao?: string;
    vencimento: string;
    valor: string | number;
    forma_pagamento?: string;
  }>;
  institutionName?: string;
  notes?: string;
  allowActions?: boolean;
}) {
  // Helpers
  const moduleTitle = module?.titulo || (course?.titulo || course?.nome || '');
  const etapa = module?.etapa || '';

  const parseToNumber = (v: unknown): number => {
    if (typeof v === 'number') return Number.isFinite(v) ? v : 0;
    const s = String(v ?? '').trim();
    if (!s) return 0;
    const n = Number(s.replace(/\./g, '').replace(',', '.'));
    return Number.isFinite(n) ? n : 0;
  };

  const hoursTeoricas = parseToNumber(module?.limite);
  const hoursPraticas = parseToNumber(module?.limite_pratico);
  const valorItemMasked = (() => {
    const v = module?.valor || course?.valor || '';
    if (typeof v === 'string' && v.trim().length > 0) {
      return v.startsWith('R$') ? v : `R$ ${v}`;
    }
    return subtotalMasked || 'R$ 0,00';
  })();

  const buildPdfParams = () => ({
    title,
    proposalNumber,
    clientName: clientName || 'Cliente',
    clientId,
    clientPhone,
    clientEmail,
    validityDate,
    issueDate: new Date().toLocaleDateString('pt-BR'),
    courseTitle: course?.titulo || course?.nome || '',
    moduleTitle,
    stageName: etapa || 'Única',
    workload: `${hoursTeoricas + hoursPraticas}h (${hoursTeoricas}T | ${hoursPraticas}P)`,
    status,
    subtotal: subtotalMasked || valorItemMasked,
    discountAmount: discountAmountMasked,
    discountLabel,
    total: totalMasked || subtotalMasked || 'R$ 0,00',
    installments,
    institutionName,
    notes,
  });

  const handlePrint = () => {
    printCommercialProposalPdf(buildPdfParams());
  };

  const handleDownload = () => {
    downloadCommercialProposalPdf(buildPdfParams());
  };

  return (
    <Card className="border-0 shadow-lg overflow-hidden bg-white/80 backdrop-blur-md ring-1 ring-black/5">
      {/* Premium Header */}
      <div className="bg-slate-900 p-5 md:p-6 text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 p-4 opacity-5 transform rotate-12 scale-125 pointer-events-none">
           <FileText className="h-32 w-32" />
        </div>
        
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="space-y-1">
            <h2 className="text-xl font-bold tracking-tight flex items-center gap-2">
              <FileText className="h-5 w-5 text-emerald-400" />
              {title}
            </h2>
            <p className="text-slate-400 text-sm max-w-md">
               {description}
            </p>
          </div>
          
          <div className="flex flex-wrap items-center gap-3">
            {allowActions && (
              <div className="flex items-center gap-2 mr-1">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handlePrint}
                  className="bg-white/10 hover:bg-white/20 text-white border-white/20 h-9 gap-1.5 shadow-sm text-xs font-bold"
                  title="Imprimir proposta comercial"
                >
                  <Printer className="h-3.5 w-3.5 text-emerald-400" />
                  Imprimir
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleDownload}
                  className="bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border-emerald-500/30 h-9 gap-1.5 shadow-sm text-xs font-bold"
                  title="Baixar em formato PDF"
                >
                  <Download className="h-3.5 w-3.5 text-emerald-400" />
                  Baixar PDF
                </Button>
              </div>
            )}

            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-2.5 px-3 border border-white/10 flex items-center gap-2.5">
               <div className="h-7 w-7 rounded-full bg-emerald-500/20 flex items-center justify-center shrink-0">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400" />
               </div>
               <div>
                  <p className="text-[9px] font-bold text-emerald-400 uppercase tracking-wider mb-0">Status</p>
                  <p className="text-xs font-bold text-white leading-tight">{status}</p>
               </div>
            </div>
          </div>
        </div>
      </div>

      <CardContent className="p-0">
        {/* Client Info Grid */}
        {(showClientInfo || showValidity) && (
          <div className="grid grid-cols-1 md:grid-cols-12 divide-y md:divide-y-0 md:divide-x border-b">
             {/* Column 1: Client Details */}
             {showClientInfo && (
               <div className={`${showValidity ? 'md:col-span-7' : 'md:col-span-12'} p-6 md:p-8 space-y-4`}>
                  <h4 className="text-xs font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2 mb-2">
                     <User className="h-4 w-4" /> Dados do Cliente
                  </h4>
                  <div className="flex items-start gap-4">
                     <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 text-primary font-bold text-lg">
                        {clientName ? clientName.charAt(0).toUpperCase() : '?'}
                     </div>
                     <div className="space-y-1">
                        <h3 className="text-lg font-bold text-foreground leading-tight">{clientName || 'Cliente não selecionado'}</h3>
                        {clientId && <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">ID: #{String(clientId)}</p>}
                     </div>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
                     {clientEmail && (
                        <div className="flex items-center gap-2.5 p-2.5 bg-muted/30 rounded-lg border border-transparent hover:border-muted-foreground/20 transition-all">
                           <Mail className="h-4 w-4 text-primary/60 shrink-0" />
                           <span className="text-xs font-medium truncate" title={clientEmail}>{clientEmail}</span>
                        </div>
                     )}
                     {clientPhone && (
                        <div className="flex items-center gap-2.5 p-2.5 bg-muted/30 rounded-lg border border-transparent hover:border-muted-foreground/20 transition-all">
                           <Phone className="h-4 w-4 text-primary/60 shrink-0" />
                           <span className="text-xs font-medium">{clientPhone}</span>
                        </div>
                     )}
                  </div>
               </div>
             )}

             {/* Column 2: Dates & Validity */}
             {showValidity && (
               <div className={`${showClientInfo ? 'md:col-span-5' : 'md:col-span-12'} p-6 md:p-8 bg-muted/5 space-y-4`}>
                  <h4 className="text-xs font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2 mb-2">
                     <Calendar className="h-4 w-4" /> Detalhes da Validade
                  </h4>
                  <div className="space-y-3">
                     <div className="flex justify-between items-center p-2.5 px-3 bg-white rounded-lg border shadow-xs">
                        <span className="text-xs font-bold text-muted-foreground uppercase">Emissão</span>
                        <span className="text-sm font-mono font-bold text-foreground">{new Date().toLocaleDateString('pt-BR')}</span>
                     </div>
                     <div className="flex justify-between items-center p-2.5 px-3 bg-emerald-50 rounded-lg border border-emerald-100 shadow-xs">
                        <span className="text-xs font-bold text-emerald-700 uppercase">Válido Até</span>
                        <span className="text-sm font-mono font-bold text-emerald-800">{validityDate || '15 dias corridos'}</span>
                     </div>
                  </div>
               </div>
             )}
          </div>
        )}

        {/* Financial Details */}
        <div className="p-6 md:p-8">
           <h4 className="text-xs font-black uppercase tracking-widest text-muted-foreground mb-4 flex items-center gap-2">
              <DollarSign className="h-4 w-4" /> Detalhamento Financeiro
           </h4>
           
           <div className="rounded-xl border overflow-hidden">
             <Table>
               <TableHeader className="bg-muted/40">
                 <TableRow className="border-b hover:bg-transparent">
                   <TableHead className="h-11 px-6 text-[10px] font-black uppercase tracking-wider text-muted-foreground/70">Item / Descrição</TableHead>
                   <TableHead className="h-11 px-4 text-[10px] font-black uppercase tracking-wider text-muted-foreground/70 text-center">Etapa</TableHead>
                   <TableHead className="h-11 px-4 text-[10px] font-black uppercase tracking-wider text-muted-foreground/70 text-center">C. Horária</TableHead>
                   <TableHead className="h-11 px-6 text-[10px] font-black uppercase tracking-wider text-muted-foreground/70 text-right">Valor</TableHead>
                 </TableRow>
               </TableHeader>
               <TableBody>
                 <TableRow className="group hover:bg-muted/30 transition-colors border-b">
                   <TableCell className="py-3 px-6">
                     <div className="flex flex-col gap-0.5">
                        <span className="font-bold text-sm text-foreground group-hover:text-primary transition-colors flex items-center gap-1.5">
                           {moduleTitle || 'Curso / Conteúdo Programático'}
                           <ChevronRight className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity translate-x-1" />
                        </span>
                        <span className="text-xs text-muted-foreground">Módulo do Curso</span>
                     </div>
                   </TableCell>
                   <TableCell className="py-3 px-4 text-center">
                      <Badge variant="secondary" className="font-mono text-[10px] items-center">
                         {etapa || 'ÚNICA'}
                      </Badge>
                   </TableCell>
                   <TableCell className="py-3 px-4">
                      <div className="flex flex-col items-center gap-0.5">
                         <span className="text-xs font-bold text-foreground">{hoursTeoricas + hoursPraticas}h</span>
                         <div className="flex text-[9px] gap-1 text-muted-foreground">
                            <span title="Teóricas">{hoursTeoricas}T</span>
                            <span className="opacity-30">|</span>
                            <span title="Práticas">{hoursPraticas}P</span>
                         </div>
                      </div>
                   </TableCell>
                   <TableCell className="py-3 px-6 text-right">
                      <span className="font-bold text-foreground">{valorItemMasked}</span>
                   </TableCell>
                 </TableRow>

                 {/* Summary Section */}
                 <TableRow className="hover:bg-transparent border-0 bg-muted/5">
                    <TableCell colSpan={3} className="py-2.5 px-6 text-right border-t">
                       <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground/70">Subtotal</span>
                    </TableCell>
                    <TableCell className="py-2.5 px-6 text-right border-t">
                       <span className="font-bold text-muted-foreground">{subtotalMasked || valorItemMasked}</span>
                    </TableCell>
                 </TableRow>
                 
                 {discountAmountMasked && ( 
                    <TableRow className="hover:bg-transparent border-0 bg-red-50/30">
                       <TableCell colSpan={3} className="py-2 px-6 text-right">
                          <span className="text-xs font-bold uppercase tracking-wider text-red-600/70">{discountLabel}</span>
                       </TableCell>
                       <TableCell className="py-2 px-6 text-right">
                          <span className="font-bold text-red-600">- {discountAmountMasked}</span>
                       </TableCell>
                    </TableRow>
                 )}

                 <TableRow className="hover:bg-transparent border-t-2 border-primary/10 bg-primary/5">
                    <TableCell colSpan={3} className="py-4 px-6 text-right">
                       <span className="text-xs font-black uppercase tracking-[0.2em] text-primary/80">Total Final</span>
                    </TableCell>
                    <TableCell className="py-4 px-6 text-right">
                       <span className="text-2xl font-black text-primary tracking-tight">{totalMasked || subtotalMasked || 'R$ 0,00'}</span>
                    </TableCell>
                 </TableRow>
               </TableBody>
             </Table>
           </div>

           {/* Seção de parcelas planejadas se houver */}
           {installments && installments.length > 0 && (
             <div className="mt-6 space-y-3">
               <h5 className="text-[11px] font-black uppercase tracking-wider text-muted-foreground">
                 Parcelas Previstas ({installments.length}x)
               </h5>
               <div className="rounded-lg border overflow-hidden">
                 <Table>
                   <TableHeader className="bg-muted/30">
                     <TableRow className="border-b">
                       <TableHead className="h-8 px-4 text-[10px] font-bold">Parcela</TableHead>
                       <TableHead className="h-8 px-4 text-[10px] font-bold">Descrição</TableHead>
                       <TableHead className="h-8 px-4 text-[10px] font-bold text-center">Vencimento</TableHead>
                       <TableHead className="h-8 px-4 text-[10px] font-bold text-center">Forma</TableHead>
                       <TableHead className="h-8 px-4 text-[10px] font-bold text-right">Valor</TableHead>
                     </TableRow>
                   </TableHeader>
                   <TableBody>
                     {installments.map((inst, idx) => {
                       const val = typeof inst.valor === 'number'
                         ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(inst.valor)
                         : String(inst.valor);
                       return (
                         <TableRow key={idx} className="border-b text-xs">
                           <TableCell className="py-2 px-4 font-mono font-bold">#{inst.numero || idx + 1}</TableCell>
                           <TableCell className="py-2 px-4">{inst.descricao || `Parcela ${inst.numero || idx + 1}`}</TableCell>
                           <TableCell className="py-2 px-4 text-center font-mono">{inst.vencimento ? new Date(inst.vencimento).toLocaleDateString('pt-BR') : 'A definir'}</TableCell>
                           <TableCell className="py-2 px-4 text-center uppercase text-[10px] font-semibold">{inst.forma_pagamento || 'Boleto/Pix'}</TableCell>
                           <TableCell className="py-2 px-4 text-right font-mono font-bold text-primary">{val}</TableCell>
                         </TableRow>
                       );
                     })}
                   </TableBody>
                 </Table>
               </div>
             </div>
           )}
        </div>
      </CardContent>
    </Card>
  );
}
