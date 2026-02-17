import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { 
  MoreHorizontal, 
  Eye, 
  Pencil, 
  Trash2, 
  Layout, 
  Plus, 
  PlayCircle, 
  FileText, 
  Layers, 
  Clock, 
  CheckCircle2, 
  XCircle,
  ChevronRight,
  MonitorPlay,
  FileBadge,
  Sparkles
} from 'lucide-react';
import { activitiesService } from '@/services/activitiesService';
import type { ActivityRecord } from '@/types/activities';

/**
 * Activities — Listagem de atividades
 * pt-BR: Página de listagem e ações de atividades do EAD.
 * en-US: Activities listing page with actions.
 */
const Activities = () => {
  const navigate = useNavigate();
  const qc = useQueryClient();

  const listQuery = useQuery({
    queryKey: ['activities','list',1],
    queryFn: async () => activitiesService.list({ page: 1, per_page: 50 }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string | number) => activitiesService.deleteById(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['activities','list'] }),
  });

  /**
   * handleRowDoubleClick
   * pt-BR: Abre a edição da atividade ao dar duplo clique na linha.
   * en-US: Opens activity edit page on row double-click.
   */
  const handleRowDoubleClick = (id: string | number) => {
    navigate(`/admin/school/activities/${id}/edit`);
  };

  /**
   * getActivityIcon
   * pt-BR: Retorna o ícone correspondente ao tipo de atividade.
   */
  const getActivityIcon = (type?: string) => {
    const t = String(type || '').toLowerCase();
    if (t.includes('video') || t.includes('vimeo') || t.includes('youtube')) return <PlayCircle className="h-4 w-4" />;
    if (t.includes('pdf') || t.includes('doc') || t.includes('arquivo') || t.includes('apostila')) return <FileText className="h-4 w-4" />;
    return <Layers className="h-4 w-4" />;
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-700 pb-20">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-muted-foreground/60">
            <Layout className="h-3 w-3" />
            Escola
            <span className="text-primary/40">•</span>
            <span className="text-primary italic">Atividades</span>
          </div>
          <h1 className="text-3xl font-black tracking-tight text-foreground flex items-center gap-3">
            <MonitorPlay className="h-8 w-8 text-primary" />
            Atividades
          </h1>
          <p className="text-sm font-medium text-muted-foreground">Gerencie o acervo de conteúdos: vídeos, apostilas e avaliações.</p>
        </div>
        
        <Button 
          onClick={() => navigate('/admin/school/activities/create')}
          className="h-12 px-6 rounded-xl bg-primary hover:bg-primary/90 text-white font-black shadow-lg shadow-primary/20 flex items-center gap-2 transition-all hover:scale-105 active:scale-95"
        >
          <Plus className="h-5 w-5" />
          Nova Atividade
        </Button>
      </div>

      <Card className="border-none shadow-2xl bg-white/50 dark:bg-slate-900/50 backdrop-blur-xl rounded-3xl overflow-hidden">
        <CardHeader className="p-8 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shadow-sm">
              <Sparkles className="h-6 w-6" />
            </div>
            <div>
              <CardTitle className="text-xl font-black tracking-tight">Acervo de Conteúdos</CardTitle>
              <CardDescription className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 leading-none mt-1">
                {listQuery.data?.total || 0} Itens Registrados
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left border-none bg-slate-50/30 dark:bg-slate-800/10">
                  <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-muted-foreground/70">Atividade / Título</th>
                  <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-muted-foreground/70">Identificador</th>
                  <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-muted-foreground/70">Duração</th>
                  <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-muted-foreground/70 text-center">Status</th>
                  <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-muted-foreground/70 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {(listQuery.data?.data ?? []).map((a: ActivityRecord) => (
                  <tr
                    key={String(a.id)}
                    onDoubleClick={() => handleRowDoubleClick(a.id)}
                    className="group border-none hover:bg-white transition-all cursor-pointer relative"
                  >
                    <td className="px-8 py-4">
                      <div className="flex items-center gap-4">
                        <div className={`h-10 w-10 rounded-2xl flex items-center justify-center bg-slate-100 dark:bg-slate-800 text-slate-500 group-hover:bg-primary group-hover:text-white transition-all duration-300 shadow-sm shadow-inner`}>
                          {getActivityIcon(a.type_activities)}
                        </div>
                        <div className="flex flex-col">
                          <span className="font-bold text-foreground tracking-tight group-hover:text-primary transition-colors text-sm">{a.title}</span>
                          <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 flex items-center gap-1">
                            {a.type_activities}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-4">
                      <code className="text-[10px] font-bold px-2 py-1 bg-slate-100 dark:bg-slate-800 rounded-lg text-slate-500 group-hover:bg-primary/5 group-hover:text-primary transition-colors">
                        {a.name}
                      </code>
                    </td>
                    <td className="px-8 py-4">
                      <div className="flex items-center gap-2 text-muted-foreground font-medium text-xs">
                        <Clock className="h-3 w-3" />
                        {a.duration} {a.type_duration}
                      </div>
                    </td>
                    <td className="px-8 py-4 text-center">
                      {(a.active === true || a.active === 's' || a.active === 1) ? (
                        <Badge variant="outline" className="h-7 border-none bg-emerald-500/10 text-emerald-600 font-black text-[9px] uppercase tracking-widest px-3 rounded-lg group-hover:bg-emerald-600 group-hover:text-white transition-all">
                          Ativo
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="h-7 border-none bg-slate-100 dark:bg-slate-800 text-slate-400 font-black text-[9px] uppercase tracking-widest px-3 rounded-lg group-hover:bg-slate-400 group-hover:text-white transition-all">
                          Inativo
                        </Badge>
                      )}
                    </td>
                    <td className="px-8 py-4 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-10 w-10 rounded-xl hover:bg-primary/5 hover:text-primary transition-all p-0">
                            <MoreHorizontal className="h-5 w-5" />
                            <span className="sr-only">Ações</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48 rounded-2xl border-slate-200 shadow-2xl p-2 animate-in slide-in-from-top-2 duration-200">
                          <DropdownMenuItem onClick={() => navigate(`/admin/school/activities/${a.id}/view`)} className="rounded-xl font-bold gap-3 focus:bg-primary/5 focus:text-primary py-2.5">
                            <Eye className="h-4 w-4" />
                            Visualizar
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => navigate(`/admin/school/activities/${a.id}/edit`)} className="rounded-xl font-bold gap-3 focus:bg-primary/5 focus:text-primary py-2.5">
                            <Pencil className="h-4 w-4" />
                            Editar
                          </DropdownMenuItem>
                          <div className="h-px bg-slate-100 my-1" />
                          <DropdownMenuItem onClick={() => deleteMutation.mutate(a.id)} className="rounded-xl font-bold gap-3 text-red-500 focus:bg-red-50 focus:text-red-600 py-2.5">
                            <Trash2 className="h-4 w-4" />
                            Excluir
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))}
                {!listQuery.data?.data?.length && !listQuery.isLoading && (
                  <tr>
                    <td className="p-20 text-center" colSpan={5}>
                      <div className="flex flex-col items-center gap-4 opacity-40">
                        <MonitorPlay className="h-12 w-12" />
                        <p className="font-black uppercase tracking-widest text-xs">Nenhuma atividade encontrada</p>
                        <Button 
                          variant="outline" 
                          onClick={() => navigate('/admin/school/activities/create')}
                          className="rounded-xl font-black text-[10px] uppercase tracking-widest h-9"
                        >
                          Criar Primeira Atividade
                        </Button>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Activities;