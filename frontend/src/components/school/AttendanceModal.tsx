import { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2, ClipboardCheck, Search } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { liveSessionsService } from '@/services/liveSessionsService';
import { coursesService } from '@/services/coursesService';
import type { LiveSessionRecord } from '@/types/liveSessions';
import { Input } from '@/components/ui/input';

interface AttendanceModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  session: LiveSessionRecord | null;
}

export function AttendanceModal({ open, onOpenChange, session }: AttendanceModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState('');
  
  // Initialize absent user IDs from session
  const [absentIds, setAbsentIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (open && session) {
      setAbsentIds(new Set(session.absent_user_ids || []));
      setSearch('');
    }
  }, [open, session]);

  // Fetch students enrolled in the class (turma)
  const studentsQuery = useQuery({
    queryKey: ['matriculas', 'turma', session?.id_turma],
    queryFn: async () => {
      // Assuming GenericApiService has list or we can use custom get
      const res = await coursesService.customGet<any>(`/matriculas`, {
        id_turma: session?.id_turma,
        situacao: 'mat', // Only enrolled students
        per_page: 500,
      });
      return Array.isArray(res.data) ? res.data : (res.items || []);
    },
    enabled: open && !!session?.id_turma,
  });

  const students = studentsQuery.data || [];

  const filteredStudents = useMemo(() => {
    if (!search.trim()) return students;
    const lower = search.toLowerCase();
    return students.filter((m: any) => 
      m.cliente?.nome?.toLowerCase().includes(lower) || 
      m.cliente?.email?.toLowerCase().includes(lower)
    );
  }, [students, search]);

  const syncMutation = useMutation({
    mutationFn: (absent_user_ids: string[]) => {
      if (!session) throw new Error('Sem sessão');
      return liveSessionsService.syncAbsences(session.id, absent_user_ids);
    },
    onSuccess: (data) => {
      toast({
        title: 'Presença salva',
        description: 'A lista de presença foi atualizada com sucesso.',
      });
      // Invalidate to refresh the session list and update absences
      queryClient.invalidateQueries({ queryKey: ['live-sessions'] });
      onOpenChange(false);
    },
    onError: () => {
      toast({
        title: 'Erro',
        description: 'Não foi possível salvar a lista de presença.',
        variant: 'destructive',
      });
    },
  });

  const handleToggle = (userId: string | number) => {
    const id = String(userId);
    setAbsentIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSave = () => {
    syncMutation.mutate(Array.from(absentIds));
  };

  const handleMarkAllPresent = () => setAbsentIds(new Set());
  const handleMarkAllAbsent = () => {
    const all = new Set<string>(students.map((m: any) => String(m.id_cliente)));
    setAbsentIds(all);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] flex flex-col p-0 overflow-hidden">
        <DialogHeader className="p-6 pb-4 border-b">
          <DialogTitle className="flex items-center gap-2 text-xl">
            <ClipboardCheck className="w-5 h-5 text-primary" />
            Lista de Presença
          </DialogTitle>
          <DialogDescription>
            Marque os alunos que <strong>faltaram</strong> nesta aula. Alunos não marcados serão considerados presentes.
            <br />
            <strong className="text-foreground mt-1 block truncate">Aula: {session?.titulo}</strong>
          </DialogDescription>
        </DialogHeader>

        <div className="px-6 py-3 border-b bg-slate-50 dark:bg-slate-900/50 flex flex-col gap-3">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input 
              placeholder="Buscar aluno..." 
              className="pl-9 bg-white dark:bg-slate-950" 
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <div className="flex gap-2 justify-between text-xs font-medium">
            <span className="text-muted-foreground">
              {students.length} alunos matriculados
            </span>
            <div className="space-x-3">
              <button onClick={handleMarkAllPresent} className="text-primary hover:underline">Todos Presentes</button>
              <button onClick={handleMarkAllAbsent} className="text-red-500 hover:underline">Todos Faltaram</button>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 pt-2">
          {studentsQuery.isLoading ? (
            <div className="flex justify-center py-8 text-muted-foreground">
              <Loader2 className="w-6 h-6 animate-spin" />
            </div>
          ) : students.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground bg-slate-50 dark:bg-slate-900/50 rounded-lg border border-dashed">
              Nenhum aluno matriculado nesta turma.
            </div>
          ) : filteredStudents.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Nenhum aluno encontrado para "{search}".
            </div>
          ) : (
            <div className="space-y-1">
              {filteredStudents.map((m: any) => {
                const isAbsent = absentIds.has(String(m.id_cliente));
                return (
                  <label 
                    key={m.id} 
                    className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                      isAbsent 
                        ? 'bg-red-50/50 border-red-100 dark:bg-red-950/20 dark:border-red-900/30' 
                        : 'hover:bg-slate-50 dark:hover:bg-slate-900 border-transparent'
                    }`}
                  >
                    <Checkbox 
                      checked={!isAbsent} 
                      onCheckedChange={() => handleToggle(m.id_cliente)}
                      className="data-[state=checked]:bg-green-500 data-[state=checked]:border-green-500"
                    />
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-bold truncate ${isAbsent ? 'text-red-700 dark:text-red-400' : 'text-slate-700 dark:text-slate-200'}`}>
                        {m.cliente?.nome || 'Aluno Sem Nome'}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">{m.cliente?.email}</p>
                    </div>
                    <span className={`text-[10px] font-bold uppercase px-2 py-1 rounded-md ${
                      isAbsent ? 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-400' : 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-400'
                    }`}>
                      {isAbsent ? 'Falta' : 'Presente'}
                    </span>
                  </label>
                );
              })}
            </div>
          )}
        </div>

        <DialogFooter className="p-6 border-t bg-slate-50 dark:bg-slate-900/50">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSave} disabled={syncMutation.isPending}>
            {syncMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Salvar Presença
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
