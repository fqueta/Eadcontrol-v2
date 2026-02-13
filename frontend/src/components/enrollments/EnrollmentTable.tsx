import React from 'react';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuLabel, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { Loader2, MoreHorizontal, Eye, Edit, Trash2, BarChart3, Award } from 'lucide-react';

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
 * pt-BR: Componente de tabela reutilizável para listar matrículas, com ações em cada linha.
 *        Exibe colunas padrão (ID, Cliente, Curso, Turma, Status, Valor) e menu de ações.
 * en-US: Reusable table component to list enrollments, with per-row actions.
 *        Shows standard columns (ID, Client, Course, Class, Status, Amount) and actions menu.
 */
export default function EnrollmentTable({ items, isLoading, onView, onEdit, onDelete, resolveAmountBRL, onProgress, onGenerateCertificate }: EnrollmentTableProps) {
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
   * pt-BR: Retorna o componente Badge estilizado de acordo com a situação.
   * en-US: Returns the Badge component styled according to the situation.
   */
  function resolveStatusBadge(enroll: any) {
    const s = String(enroll?.situacao ?? enroll?.status ?? enroll?.config?.situacao ?? '').toLowerCase();
    
    if (s.startsWith('mat')) {
      return <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100 transition-colors">Matriculado</Badge>;
    }
    if (s.startsWith('can')) {
      return <Badge variant="destructive" className="bg-red-50 text-red-700 border-red-200 hover:bg-red-100 transition-colors">Cancelado</Badge>;
    }
    if (s.startsWith('pen') || s.startsWith('agu')) {
      return <Badge className="bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100 transition-colors">Pendente</Badge>;
    }
    if (s.startsWith('fin')) {
      return <Badge className="bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100 transition-colors">Finalizado</Badge>;
    }
    
    return s ? <Badge variant="outline" className="font-medium">{s}</Badge> : <span className="text-muted-foreground">-</span>;
  }

  return (
    <div className="rounded-md border shadow-sm overflow-hidden bg-white">
      <Table>
        <TableHeader className="bg-muted/30">
          <TableRow>
            <TableHead className="w-[80px] font-semibold text-foreground/80">ID</TableHead>
            <TableHead className="font-semibold text-foreground/80">Cliente</TableHead>
            <TableHead className="font-semibold text-foreground/80">Curso</TableHead>
            <TableHead className="font-semibold text-foreground/80">Turma</TableHead>
            <TableHead className="font-semibold text-foreground/80">Situação</TableHead>
            <TableHead className="font-semibold text-foreground/80">Valor (BRL)</TableHead>
            <TableHead className="text-right font-semibold text-foreground/80">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading && (
            <TableRow>
              <TableCell colSpan={7} className="h-24 text-center">
                <div className="flex items-center justify-center gap-2 text-muted-foreground">
                  <Loader2 className="h-5 w-5 animate-spin" /> 
                  <span className="text-sm font-medium">Carregando matrículas...</span>
                </div>
              </TableCell>
            </TableRow>
          )}

          {!isLoading && items.length === 0 && (
            <TableRow>
              <TableCell colSpan={7} className="h-24 text-center">
                <div className="text-sm text-muted-foreground font-medium">Nenhuma matrícula encontrada</div>
              </TableCell>
            </TableRow>
          )}

          {!isLoading && items.map((enroll: any) => (
            <TableRow key={String(enroll.id)} className="transition-colors hover:bg-muted/20 items-center">
              <TableCell className="font-mono text-[11px] text-muted-foreground">{String(enroll.id)}</TableCell>
              <TableCell className="font-medium text-foreground/90">
                {enroll.cliente_nome || enroll.student_name || enroll.name || '-'}
              </TableCell>
              <TableCell className="max-w-[240px] truncate text-sm">
                {enroll.curso_nome || enroll.course_name || '-'}
              </TableCell>
              <TableCell>
                <span className="text-xs bg-muted px-2 py-0.5 rounded-full text-muted-foreground font-medium">
                  {enroll.turma_nome ?? enroll?.turma?.nome ?? '-'}
                </span>
              </TableCell>
              <TableCell>
                {resolveStatusBadge(enroll)}
              </TableCell>
              <TableCell className="font-medium text-sm">
                {amountFormatter(enroll)}
              </TableCell>
              <TableCell className="text-right">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="h-8 w-8 p-0 rounded-full hover:bg-muted focus-visible:ring-0">
                      <span className="sr-only">Abrir menu</span>
                      <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-[180px]">
                    <DropdownMenuLabel className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-2 py-1.5">Ações</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => onView?.(enroll)} className="cursor-pointer">
                      <Eye className="mr-2 h-4 w-4 text-blue-500" /> 
                      <span className="font-medium">Visualizar</span>
                    </DropdownMenuItem>
                    {isMatriculated(enroll) && (
                      <DropdownMenuItem onClick={() => onProgress?.(enroll)} className="cursor-pointer">
                        <BarChart3 className="mr-2 h-4 w-4 text-emerald-500" /> 
                        <span className="font-medium">Progresso</span>
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem onClick={() => onGenerateCertificate?.(enroll)} className="cursor-pointer">
                      <Award className="mr-2 h-4 w-4 text-amber-500" /> 
                      <span className="font-medium">Gerar certificado</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onEdit?.(enroll)} className="cursor-pointer">
                      <Edit className="mr-2 h-4 w-4 text-slate-500" /> 
                      <span className="font-medium">Editar</span>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem className="text-red-600 cursor-pointer focus:bg-red-50 focus:text-red-700" onClick={() => onDelete?.(enroll)}>
                      <Trash2 className="mr-2 h-4 w-4" /> 
                      <span className="font-medium">Excluir</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}