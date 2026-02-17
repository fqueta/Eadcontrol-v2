import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { modulesService } from '@/services/modulesService';
import type { ModuleRecord } from '@/types/modules';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { 
  Plus, 
  Edit, 
  Trash2, 
  LayoutGrid, 
  Clock, 
  Settings2, 
  Search,
  BookOpen,
  CheckCircle2,
  XCircle,
  MoreHorizontal
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

/**
 * Modules — Listagem de módulos
 * pt-BR: Página de listagem e ações de módulos do EAD com visual premium.
 * en-US: Modules listing page with premium visuals and actions.
 */
const Modules = () => {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { toast } = useToast();

  const listQuery = useQuery({
    queryKey: ['modules', 'list', 1],
    queryFn: async () => modulesService.list({ page: 1, per_page: 50 }),
  });

  const toggleStatusMutation = useMutation({
    mutationFn: async ({ id, active }: { id: string | number; active: string }) => {
      return modulesService.update(id, { active });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['modules', 'list'] });
      toast({
        title: "Status atualizado",
        description: "O status do módulo foi alterado com sucesso.",
      });
    },
    onError: () => {
      toast({
        title: "Erro ao atualizar",
        description: "Não foi possível alterar o status do módulo.",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string | number) => {
      if (!window.confirm('Deseja realmente excluir este módulo?')) return;
      return modulesService.deleteById(id);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['modules', 'list'] });
      toast({
        title: "Módulo excluído",
        description: "O módulo foi removido com sucesso.",
      });
    },
  });

  const handleRowDoubleClick = (id: string | number) => {
    navigate(`/admin/school/modules/${id}/edit`);
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-foreground flex items-center gap-3">
            <LayoutGrid className="h-8 w-8 text-primary" />
            Módulos
          </h1>
          <p className="text-muted-foreground font-medium">
            Gerencie e organize os módulos de conteúdos dos seus cursos.
          </p>
        </div>
        <Button 
          onClick={() => navigate('/admin/school/modules/create')}
          className="bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20 font-bold rounded-xl h-11 px-6 transition-all active:scale-95"
        >
          <Plus className="h-5 w-5 mr-2" />
          Novo Módulo
        </Button>
      </div>

      <Card className="border-none shadow-2xl bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm overflow-hidden rounded-2xl">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50">
                  <th className="px-6 py-4 text-left text-xs font-black uppercase tracking-widest text-muted-foreground/70">Módulo</th>
                  <th className="px-6 py-4 text-left text-xs font-black uppercase tracking-widest text-muted-foreground/70">Identificador</th>
                  <th className="px-6 py-4 text-left text-xs font-black uppercase tracking-widest text-muted-foreground/70">
                    <div className="flex items-center gap-2 italic">
                      <Clock className="h-3 w-3" /> Tipo / Duração
                    </div>
                  </th>
                  <th className="px-6 py-4 text-center text-xs font-black uppercase tracking-widest text-muted-foreground/70">Status</th>
                  <th className="px-6 py-4 text-right text-xs font-black uppercase tracking-widest text-muted-foreground/70">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {listQuery.isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i} className="animate-pulse">
                      <td colSpan={5} className="px-6 py-8">
                        <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-full opacity-20" />
                      </td>
                    </tr>
                  ))
                ) : (listQuery.data?.data ?? []).map((m: ModuleRecord) => {
                  const isActive = m.active === true || m.active === 's' || m.active === 1;
                  return (
                    <tr
                      key={String(m.id)}
                      onDoubleClick={() => handleRowDoubleClick(m.id)}
                      className="group hover:bg-slate-50/80 dark:hover:bg-slate-800/80 transition-all cursor-pointer border-transparent"
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-4">
                          <Avatar className="h-10 w-10 rounded-xl border-2 border-white dark:border-slate-950 shadow-sm transition-transform group-hover:scale-110">
                            <AvatarFallback className="bg-primary/10 text-primary font-black text-xs uppercase">
                              {m.title?.substring(0, 2) || 'MO'}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex flex-col">
                            <span className="font-bold text-foreground/90 group-hover:text-primary transition-colors">{m.title}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <code className="text-[11px] font-mono font-bold bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded text-muted-foreground">
                          {m.name || 'n/a'}
                        </code>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-1">
                          <Badge variant="outline" className="w-fit font-bold text-[10px] uppercase tracking-tighter bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700">
                            {m.tipo_duracao || 'seg'}
                          </Badge>
                          <span className="text-xs font-black text-primary/80">{m.duration || 0}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex flex-col items-center gap-1.5">
                          <Switch
                            checked={isActive}
                            onCheckedChange={(checked) => 
                              toggleStatusMutation.mutate({ id: m.id, active: checked ? 's' : 'n' })
                            }
                            className="data-[state=checked]:bg-green-500 scale-110"
                            onClick={(e) => e.stopPropagation()}
                          />
                          <span className={`text-[10px] font-black uppercase tracking-widest ${isActive ? 'text-green-500' : 'text-slate-400'}`}>
                            {isActive ? 'Ativo' : 'Inativo'}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="h-9 w-9 p-0 rounded-xl border-slate-200 dark:border-slate-700 hover:bg-primary/5 hover:text-primary transition-all"
                            asChild
                          >
                            <Link to={`/admin/school/modules/${m.id}/edit`}>
                              <Edit className="h-4 w-4" />
                            </Link>
                          </Button>
                          
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" className="h-9 w-9 p-0 rounded-xl">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="rounded-xl border-slate-200 dark:border-slate-700">
                              <DropdownMenuItem className="gap-2 font-bold cursor-pointer focus:text-primary" onClick={() => navigate(`/admin/school/modules/${m.id}/edit`)}>
                                <Settings2 className="h-4 w-4" /> Configurações
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                className="gap-2 font-bold cursor-pointer text-destructive focus:text-destructive focus:bg-destructive/10" 
                                onClick={() => deleteMutation.mutate(m.id)}
                              >
                                <Trash2 className="h-4 w-4" /> Excluir Módulo
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          
          {(!listQuery.isLoading && !listQuery.data?.data?.length) && (
            <div className="py-20 flex flex-col items-center justify-center text-center space-y-4">
              <div className="h-20 w-20 rounded-3xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center border-2 border-dashed border-slate-200 dark:border-slate-700 shadow-inner">
                <BookOpen className="h-10 w-10 text-slate-300" />
              </div>
              <div className="max-w-[300px]">
                <h3 className="text-xl font-black text-foreground/80">Nenhum módulo encontrado</h3>
                <p className="text-sm text-muted-foreground font-medium">Parece que você ainda não cadastrou nenhum módulo para seus cursos.</p>
              </div>
              <Button onClick={() => navigate('/admin/school/modules/create')} variant="outline" className="font-bold rounded-xl border-primary/20 hover:bg-primary/5 hover:text-primary">
                Começar agora
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Modules;