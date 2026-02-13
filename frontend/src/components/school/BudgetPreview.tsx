import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { CourseRecord, CourseModule } from '@/types/courses';
import { User, Phone, Mail, Calendar, Clock, ChevronRight, FileText, CheckCircle2, DollarSign } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

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

  return (
    <Card className="border-0 shadow-lg overflow-hidden bg-white/80 backdrop-blur-md ring-1 ring-black/5">
      {/* Premium Header */}
      <div className="bg-gradient-to-r from-slate-900 to-slate-800 p-8 text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-5 transform rotate-12 scale-150 pointer-events-none">
           <FileText className="h-64 w-64" />
        </div>
        
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="space-y-2">
            <Badge variant="outline" className="text-white/80 border-white/20 uppercase tracking-[0.2em] font-bold text-[10px] px-3 py-1 bg-white/5 backdrop-blur-sm">
               Documento Oficial
            </Badge>
            <h2 className="text-3xl font-black tracking-tight flex items-center gap-3">
              <FileText className="h-8 w-8 text-primary-400" />
              {title}
            </h2>
            <p className="text-slate-400 text-sm max-w-md">
               Confira os detalhes da proposta comercial preparada especialmente para você.
            </p>
          </div>
          
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/10 flex items-center gap-4 min-w-[200px]">
             <div className="h-10 w-10 rounded-full bg-emerald-500/20 flex items-center justify-center shrink-0">
                <CheckCircle2 className="h-5 w-5 text-emerald-400" />
             </div>
             <div>
                <p className="text-xs font-bold text-emerald-400 uppercase tracking-wider mb-0.5">Status</p>
                <p className="text-sm font-bold text-white">Aguardando Aprovação</p>
             </div>
          </div>
        </div>
      </div>

      <CardContent className="p-0">
        {/* Client Info Grid */}
        <div className="grid grid-cols-1 md:grid-cols-12 divide-y md:divide-y-0 md:divide-x border-b">
           {/* Column 1: Client Details */}
           <div className="md:col-span-7 p-8 space-y-6">
              <h4 className="text-xs font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2 mb-4">
                 <User className="h-4 w-4" /> Dados do Cliente
              </h4>
              <div className="flex items-start gap-4">
                 <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 text-primary font-bold text-lg">
                    {clientName.charAt(0).toUpperCase()}
                 </div>
                 <div className="space-y-1">
                    <h3 className="text-lg font-bold text-foreground leading-tight">{clientName}</h3>
                    {clientId && <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">ID: #{String(clientId)}</p>}
                 </div>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                 {clientEmail && (
                    <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg border border-transparent hover:border-muted-foreground/20 transition-all">
                       <Mail className="h-4 w-4 text-primary/60" />
                       <span className="text-sm font-medium truncate" title={clientEmail}>{clientEmail}</span>
                    </div>
                 )}
                 {clientPhone && (
                    <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg border border-transparent hover:border-muted-foreground/20 transition-all">
                       <Phone className="h-4 w-4 text-primary/60" />
                       <span className="text-sm font-medium">{clientPhone}</span>
                    </div>
                 )}
              </div>
           </div>

           {/* Column 2: Dates & Validity */}
           <div className="md:col-span-5 p-8 bg-muted/5 space-y-6">
              <h4 className="text-xs font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2 mb-4">
                 <Calendar className="h-4 w-4" /> Detalhes da Validade
              </h4>
              <div className="space-y-4">
                 <div className="flex justify-between items-center p-3 bg-white rounded-lg border shadow-sm">
                    <span className="text-xs font-bold text-muted-foreground uppercase">Emissão</span>
                    <span className="text-sm font-mono font-bold text-foreground">{new Date().toLocaleDateString('pt-BR')}</span>
                 </div>
                 <div className="flex justify-between items-center p-3 bg-emerald-50 rounded-lg border border-emerald-100 shadow-sm">
                    <span className="text-xs font-bold text-emerald-700 uppercase">Válido Até</span>
                    <span className="text-sm font-mono font-bold text-emerald-800">{validityDate || '—'}</span>
                 </div>
              </div>
           </div>
        </div>

        {/* Financial Details */}
        <div className="p-8">
           <h4 className="text-xs font-black uppercase tracking-widest text-muted-foreground mb-6 flex items-center gap-2">
              <DollarSign className="h-4 w-4" /> Detalhamento Financeiro
           </h4>
           
           <div className="rounded-xl border overflow-hidden">
             <Table>
               <TableHeader className="bg-muted/40">
                 <TableRow className="border-b hover:bg-transparent">
                   <TableHead className="h-12 px-6 text-[10px] font-black uppercase tracking-wider text-muted-foreground/70">Item / Descrição</TableHead>
                   <TableHead className="h-12 px-4 text-[10px] font-black uppercase tracking-wider text-muted-foreground/70 text-center">Etapa</TableHead>
                   <TableHead className="h-12 px-4 text-[10px] font-black uppercase tracking-wider text-muted-foreground/70 text-center">C. Horária</TableHead>
                   <TableHead className="h-12 px-6 text-[10px] font-black uppercase tracking-wider text-muted-foreground/70 text-right">Valor</TableHead>
                 </TableRow>
               </TableHeader>
               <TableBody>
                 <TableRow className="group hover:bg-muted/30 transition-colors border-b">
                   <TableCell className="py-4 px-6">
                     <div className="flex flex-col gap-1">
                        <span className="font-bold text-sm text-foreground group-hover:text-primary transition-colors flex items-center gap-2">
                           {moduleTitle}
                           <ChevronRight className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity translate-x-1" />
                        </span>
                        <span className="text-xs text-muted-foreground">Módulo do Curso</span>
                     </div>
                   </TableCell>
                   <TableCell className="py-4 px-4 text-center">
                      <Badge variant="secondary" className="font-mono text-[10px] items-center">
                         {etapa || 'ÚNICA'}
                      </Badge>
                   </TableCell>
                   <TableCell className="py-4 px-4">
                      <div className="flex flex-col items-center gap-1">
                         <span className="text-xs font-bold text-foreground">{hoursTeoricas + hoursPraticas}h</span>
                         <div className="flex text-[9px] gap-1 text-muted-foreground">
                            <span title="Teóricas">{hoursTeoricas}T</span>
                            <span className="opacity-30">|</span>
                            <span title="Práticas">{hoursPraticas}P</span>
                         </div>
                      </div>
                   </TableCell>
                   <TableCell className="py-4 px-6 text-right">
                      <span className="font-bold text-foreground">{valorItemMasked}</span>
                   </TableCell>
                 </TableRow>

                 {/* Summary Section */}
                 <TableRow className="hover:bg-transparent border-0 bg-muted/5">
                    <TableCell colSpan={3} className="py-3 px-6 text-right border-t">
                       <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground/70">Subtotal</span>
                    </TableCell>
                    <TableCell className="py-3 px-6 text-right border-t">
                       <span className="font-bold text-muted-foreground">{subtotalMasked}</span>
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
                    <TableCell colSpan={3} className="py-6 px-6 text-right">
                       <span className="text-xs font-black uppercase tracking-[0.2em] text-primary/80">Total Final</span>
                    </TableCell>
                    <TableCell className="py-6 px-6 text-right">
                       <span className="text-2xl font-black text-primary tracking-tight">{totalMasked}</span>
                    </TableCell>
                 </TableRow>
               </TableBody>
             </Table>
           </div>
        </div>
      </CardContent>
    </Card>
  );
}