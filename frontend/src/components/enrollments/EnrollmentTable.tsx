import React from 'react';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
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
  DollarSign,
  Activity
} from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Progress } from '@/components/ui/progress';

/**
 * StatusSwitch
 * pt-BR: Sub-componente de switch com estado local para feedback imediato.
 * en-US: Switch sub-component with local state for immediate feedback.
 */
function StatusSwitch({ checked, onCheckedChange }: { checked: boolean; onCheckedChange: (checked: boolean) => void }) {
  const [localChecked, setLocalChecked] = React.useState(checked);

  // Sync with prop if it changes externally (e.g., after a successful mutation/refetch)
  React.useEffect(() => {
    setLocalChecked(checked);
  }, [checked]);

  const handleToggle = (newValue: boolean) => {
    setLocalChecked(newValue);
    onCheckedChange(newValue);
  };

  return (
    <Switch
      checked={localChecked}
      onCheckedChange={handleToggle}
      className="data-[state=checked]:bg-emerald-500 mx-auto"
    />
  );
}

export interface EnrollmentTableProps {
  items: any[];
  isLoading?: boolean;
  /** Optional flag when a background refetch is happening; not used for UI state here */
  isFetching?: boolean;
  onView?: (item: any) => void;
  onEdit?: (item: any, tab?: string) => void;
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
  onToggleActive?: (item: any, isActive: boolean) => void;
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
  onGenerateCertificate,
  onToggleActive
}: EnrollmentTableProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const amountFormatter = resolveAmountBRL || (() => '-');

  /**
   * isMatriculated
   * pt-BR: Determina se a matrícula está em situação 'mat' (matriculado).
   * en-US: Determines if enrollment situation is 'mat' (enrolled).
   */
  function isMatriculated(enroll: any): boolean {
    const s = String(enroll?.situacao ?? enroll?.status ?? enroll?.config?.situacao ?? '').toLowerCase();
    return s.startsWith('mat') || s.startsWith('cur') || s.startsWith('con');
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

  function resolvePace(enroll: any) {
    const progress = Number(enroll?.progresso ?? enroll?.progress ?? enroll?.meta?.progresso ?? 0);
    
    // pt-BR: Cores baseadas na "saúde" da matrícula
    // en-US: Colors based on enrollment "health"
    const colorClass = progress >= 70 ? 'bg-emerald-500' : progress >= 30 ? 'bg-amber-500' : 'bg-red-500';
    const textColor = progress >= 70 ? 'text-emerald-600' : progress >= 30 ? 'text-amber-600' : 'text-red-600';
    const bgColor = progress >= 70 ? 'bg-emerald-50/50' : progress >= 30 ? 'bg-amber-50/50' : 'bg-red-50/50';

    return (
      <div className={`p-2 rounded-xl ${bgColor} border border-transparent hover:border-slate-100 transition-all space-y-1.5 group/pace`}>
        <div className="flex items-center justify-between px-0.5">
           <span className={`text-[9px] font-black uppercase tracking-tighter ${textColor}`}>{progress >= 70 ? 'Excelente' : progress >= 30 ? 'Em Ritmo' : 'Crítico'}</span>
           <span className={`text-[10px] font-black ${textColor}`}>{progress}%</span>
        </div>
        <Progress value={progress} className="h-1.5 bg-slate-200/50" indicatorClassName={`${colorClass} shadow-[0_0_8px_rgba(0,0,0,0.1)] transition-all duration-1000`} />
      </div>
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
            <TableHead className="px-6 py-4 text-center text-xs font-black uppercase tracking-widest text-muted-foreground/70 min-w-[120px]">
               <div className="flex items-center justify-center gap-2">
                  <Activity className="h-3 w-3" /> Saúde / Pace
               </div>
            </TableHead>
            <TableHead className="px-6 py-4 text-center text-xs font-black uppercase tracking-widest text-muted-foreground/70">Ativo</TableHead>
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
                <TableCell colSpan={7} className="px-6 py-10">
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
              <TableCell colSpan={7} className="h-40 text-center">
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
                <TableRow 
                  key={String(enroll.id)} 
                  onDoubleClick={() => onView?.(enroll)}
                  className="group transition-all hover:bg-slate-50/80 dark:hover:bg-slate-800/80 items-center border-transparent cursor-pointer"
                >
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
                  <TableCell className="px-6 py-4">
                    {resolvePace(enroll)}
                  </TableCell>
                  <TableCell className="px-6 py-4 text-center">
                    <StatusSwitch
                      checked={String(enroll.ativo).toLowerCase() === 's' || enroll.ativo === 1 || enroll.ativo === '1'}
                      onCheckedChange={(checked) => onToggleActive?.(enroll, checked)}
                    />
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
                          Visualizar
                        </DropdownMenuItem>
                        {isMatriculated(enroll) && Number(user?.permission_id) <= 3 && (
                          <DropdownMenuItem onClick={() => {
                            const courseId = enroll?.id_curso || enroll?.curso_id || enroll?.course_id || '';
                            navigate(`/admin/school/enrollments/${enroll.id}/progress?id_curso=${courseId}`);
                          }} className="cursor-pointer gap-2 font-bold text-xs rounded-lg">
                            <BarChart3 className="h-3.5 w-3.5 text-emerald-500" /> 
                            Ver Progresso
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuSeparator className="my-1 bg-slate-50 dark:bg-slate-800" />
                        <DropdownMenuLabel className="text-[9px] font-black text-muted-foreground uppercase tracking-widest px-2 py-2">Edição Rápida</DropdownMenuLabel>
                        <DropdownMenuItem onClick={() => onEdit?.(enroll, 'principal')} className="cursor-pointer gap-2 font-bold text-xs rounded-lg">
                          <User className="h-3.5 w-3.5 text-slate-500" /> 
                          Dados Principais
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onEdit?.(enroll, 'academico')} className="cursor-pointer gap-2 font-bold text-xs rounded-lg">
                          <BookOpen className="h-3.5 w-3.5 text-slate-500" /> 
                          Acadêmico
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onEdit?.(enroll, 'financeiro')} className="cursor-pointer gap-2 font-bold text-xs rounded-lg">
                          <DollarSign className="h-3.5 w-3.5 text-slate-500" /> 
                          Financeiro
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onEdit?.(enroll, 'acesso')} className="cursor-pointer gap-2 font-bold text-xs rounded-lg">
                          <CalendarDays className="h-3.5 w-3.5 text-slate-500" /> 
                          Acesso e Validade
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