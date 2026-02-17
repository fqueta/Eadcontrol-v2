import React from 'react';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger, 
  DropdownMenuLabel, 
  DropdownMenuSeparator 
} from '@/components/ui/dropdown-menu';
import { 
  Loader2, 
  MoreHorizontal, 
  Eye, 
  Edit, 
  Trash2, 
  BarChart3, 
  Award,
  User,
  BookOpen,
  CalendarDays,
  DollarSign
} from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

export interface EnrollmentTableProps {
  items: any[];
  isLoading?: boolean;
  /** Optional flag when a background refetch is happening; not used for UI state here */
  isFetching?: boolean;
  onView?: (item: any) => void;
  onEdit?: (item: any) => void;
  onDelete?: (item: any) => void;
  resolveAmountBRL?: (item: any) => string;
  /**
   * onProgress
   * pt-BR: Abre visualização de progresso do aluno quando situação for 'mat'.
   * en-US: Opens student progress view when situation is 'mat'.
   */
  onProgress?: (item: any) => void;
  /**
   * onGenerateCertificate
   * pt-BR: Ação para gerar/vincular certificado da matrícula selecionada.
   * en-US: Action to generate/link certificate for the selected enrollment.
   */
  onGenerateCertificate?: (item: any) => void;
}

/**
 * EnrollmentTable
 * pt-BR: Componente de tabela reutilizável para listar matrículas, com visual premium e ações em cada linha.
 * en-US: Reusable table component to list enrollments, with premium visuals and per-row actions.
 */
export default function EnrollmentTable({ 
  items, 
  isLoading, 
  onView, 
  onEdit, 
  onDelete, 
  resolveAmountBRL, 
  onProgress, 
  onGenerateCertificate 
}: EnrollmentTableProps) {
  const amountFormatter = resolveAmountBRL || (() => '-');

  /**
   * isMatriculated
   * pt-BR: Determina se a matrícula está em situação 'mat' (matriculado).
   * en-US: Determines if enrollment situation is 'mat' (enrolled).
   */
  function isMatriculated(enroll: any): boolean {
    const s = String(enroll?.situacao ?? enroll?.status ?? enroll?.config?.situacao ?? '').toLowerCase();
    return s.startsWith('mat');
  }

  /**
   * resolveStatusBadge
   * pt-BR: Retorna o componente Badge estilizado de acordo com a situação (Premium).
   * en-US: Returns the Badge component styled according to the situation (Premium).
   */
  function resolveStatusBadge(enroll: any) {
    const s = String(enroll?.situacao ?? enroll?.status ?? enroll?.config?.situacao ?? '').toLowerCase();
    
    if (s.startsWith('mat')) {
      return (
        <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 hover:bg-emerald-500/20 transition-all font-black text-[10px] uppercase tracking-widest px-2.5 py-0.5 rounded-full ring-1 ring-emerald-500/10">
          Matriculado
        </Badge>
      );
    }
    if (s.startsWith('can')) {
      return (
        <Badge variant="destructive" className="bg-red-500/10 text-red-600 border-red-500/20 hover:bg-red-500/20 transition-all font-black text-[10px] uppercase tracking-widest px-2.5 py-0.5 rounded-full ring-1 ring-red-500/10">
          Cancelado
        </Badge>
      );
    }
    if (s.startsWith('pen') || s.startsWith('agu')) {
      return (
        <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20 hover:bg-amber-500/20 transition-all font-black text-[10px] uppercase tracking-widest px-2.5 py-0.5 rounded-full ring-1 ring-amber-500/10">
          Pendente
        </Badge>
      );
    }
    if (s.startsWith('fin')) {
      return (
        <Badge className="bg-blue-500/10 text-blue-600 border-blue-500/20 hover:bg-blue-500/20 transition-all font-black text-[10px] uppercase tracking-widest px-2.5 py-0.5 rounded-full ring-1 ring-blue-500/10">
          Finalizado
        </Badge>
      );
    }
    if (s.startsWith('int')) {
      return (
        <Badge className="bg-primary/10 text-primary border-primary/20 hover:bg-primary/20 transition-all font-black text-[10px] uppercase tracking-widest px-2.5 py-0.5 rounded-full ring-1 ring-primary/10">
          Interessado
        </Badge>
      );
    }
    
    return s ? (
      <Badge variant="outline" className="font-black text-[10px] uppercase tracking-widest border-slate-200 py-0.5 px-2.5 rounded-full">
        {s}
      </Badge>
    ) : (
      <span className="text-muted-foreground italic text-xs">não informado</span>
    );
  }

  return (
    <div className="rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-500">
      <Table>
        <TableHeader className="bg-slate-50/50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800">
          <TableRow className="hover:bg-transparent">
            <TableHead className="w-[80px] px-6 py-4 text-xs font-black uppercase tracking-widest text-muted-foreground/70">ID</TableHead>
            <TableHead className="px-6 py-4 text-xs font-black uppercase tracking-widest text-muted-foreground/70">
              <div className="flex items-center gap-2">
                <User className="h-3 w-3" /> Cliente
              </div>
            </TableHead>
            <TableHead className="px-6 py-4 text-xs font-black uppercase tracking-widest text-muted-foreground/70">
              <div className="flex items-center gap-2">
                <BookOpen className="h-3 w-3" /> Curso / Turma
              </div>
            </TableHead>
            <TableHead className="px-6 py-4 text-center text-xs font-black uppercase tracking-widest text-muted-foreground/70">Situação</TableHead>
            <TableHead className="px-6 py-4 text-right text-xs font-black uppercase tracking-widest text-muted-foreground/70">
              <div className="flex items-center justify-end gap-2">
                <DollarSign className="h-3 w-3" /> Valor
              </div>
            </TableHead>
            <TableHead className="px-6 py-4 text-right text-xs font-black uppercase tracking-widest text-muted-foreground/70">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody className="divide-y divide-slate-100 dark:divide-slate-800">
          {isLoading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <TableRow key={i} className="animate-pulse">
                <TableCell colSpan={6} className="px-6 py-10">
                   <div className="flex items-center gap-4">
                     <div className="h-10 w-10 rounded-xl bg-slate-200 dark:bg-slate-800" />
                     <div className="flex flex-col gap-2 flex-1">
                        <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-1/4" />
                        <div className="h-3 bg-slate-200 dark:bg-slate-800 rounded w-1/2 opacity-50" />
                     </div>
                   </div>
                </TableCell>
              </TableRow>
            ))
          ) : items.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="h-40 text-center">
                <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground">
                  <div className="h-12 w-12 rounded-2xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center border-2 border-dashed border-slate-200 dark:border-slate-700 mb-2">
                    <User className="h-6 w-6 text-slate-300" />
                  </div>
                  <span className="text-sm font-black uppercase tracking-tight text-foreground/60">Nenhuma matrícula encontrada</span>
                  <p className="text-xs font-medium max-w-[200px]">Tente ajustar seus filtros ou termos de pesquisa.</p>
                </div>
              </TableCell>
            </TableRow>
          ) : (
            items.map((enroll: any) => {
              const studentName = enroll.cliente_nome || enroll.student_name || enroll.name || '-';
              return (
                <TableRow key={String(enroll.id)} className="group transition-all hover:bg-slate-50/80 dark:hover:bg-slate-800/80 items-center border-transparent">
                  <TableCell className="px-6 py-4 font-mono text-[10px] font-bold text-muted-foreground/60 group-hover:text-primary transition-colors">
                    {String(enroll.id).padStart(4, '0')}
                  </TableCell>
                  <TableCell className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-9 w-9 rounded-xl border-2 border-white dark:border-slate-950 shadow-sm group-hover:scale-110 transition-transform">
                        <AvatarFallback className="bg-primary/10 text-primary font-black text-xs uppercase">
                          {studentName.substring(0, 2)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex flex-col">
                        <span className="font-bold text-sm text-foreground/90 group-hover:text-primary transition-colors line-clamp-1">{studentName}</span>
                        <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">{enroll.email || 'sem email'}</span>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="px-6 py-4">
                    <div className="flex flex-col gap-1.5 max-w-[280px]">
                      <span className="font-black text-[12px] text-foreground/80 line-clamp-1 group-hover:text-foreground transition-colors">
                        {enroll.curso_nome || enroll.course_name || '-'}
                      </span>
                      <div className="flex items-center gap-1.5">
                        <CalendarDays className="h-3 w-3 text-muted-foreground" />
                        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md">
                          {enroll.turma_nome ?? enroll?.turma?.nome ?? 'Sem turma'}
                        </span>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="px-6 py-4 text-center">
                    {resolveStatusBadge(enroll)}
                  </TableCell>
                  <TableCell className="px-6 py-4 text-right">
                    <span className="font-black text-sm text-primary/90 tabular-nums">
                      {amountFormatter(enroll)}
                    </span>
                  </TableCell>
                  <TableCell className="px-6 py-4 text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-9 w-9 p-0 rounded-xl hover:bg-primary/5 group/btn focus-visible:ring-0">
                          <MoreHorizontal className="h-4 w-4 text-muted-foreground group-hover/btn:text-primary transition-colors" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-[180px] rounded-xl border-slate-100 dark:border-slate-800 shadow-xl p-1">
                        <DropdownMenuLabel className="text-[9px] font-black text-muted-foreground uppercase tracking-widest px-2 py-2">Gerenciamento</DropdownMenuLabel>
                        <DropdownMenuItem onClick={() => onView?.(enroll)} className="cursor-pointer gap-2 font-bold text-xs rounded-lg">
                          <Eye className="h-3.5 w-3.5 text-primary" /> 
                          Visualizar Proposta
                        </DropdownMenuItem>
                        {isMatriculated(enroll) && (
                          <DropdownMenuItem onClick={() => onProgress?.(enroll)} className="cursor-pointer gap-2 font-bold text-xs rounded-lg">
                            <BarChart3 className="h-3.5 w-3.5 text-emerald-500" /> 
                            Ver Progresso
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem onClick={() => onEdit?.(enroll)} className="cursor-pointer gap-2 font-bold text-xs rounded-lg">
                          <Edit className="h-3.5 w-3.5 text-slate-500" /> 
                          {String(enroll?.situacao ?? '').startsWith('int') ? 'Editar Cadastro' : 'Gerenciar Acesso / Certificado'}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator className="my-1 bg-slate-50 dark:bg-slate-800" />
                        <DropdownMenuItem className="text-red-500 cursor-pointer focus:bg-red-50 focus:text-red-600 gap-2 font-bold text-xs rounded-lg" onClick={() => onDelete?.(enroll)}>
                          <Trash2 className="h-3.5 w-3.5" /> 
                          Excluir Registro
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
    </div>
  );
}