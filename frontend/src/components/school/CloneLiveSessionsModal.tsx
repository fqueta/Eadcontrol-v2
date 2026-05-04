import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Copy, AlertCircle, Calendar } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { turmasService } from '@/services/turmasService';
import { liveSessionsService } from '@/services/liveSessionsService';

interface CloneLiveSessionsModalProps {
  open: boolean;
  onClose: () => void;
  idCurso: string;
  idTurmaOrigem: string;
  turmaOrigemNome?: string;
}

export function CloneLiveSessionsModal({ open, onClose, idCurso, idTurmaOrigem, turmaOrigemNome }: CloneLiveSessionsModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [toTurmaId, setToTurmaId] = useState<string>('');
  const [baseDate, setBaseDate] = useState<string>('');

  const turmasQuery = useQuery({
    queryKey: ['turmas', 'list', idCurso],
    queryFn: () => turmasService.listTurmas({ id_curso: Number(idCurso), per_page: 200 }),
    enabled: !!idCurso && open,
  });

  const turmaOptions = useMemo(() => {
    return (turmasQuery.data?.data ?? [])
      .filter((t: any) => String(t.id) !== idTurmaOrigem) // Exclude source turma
      .map((t: any) => ({ id: String(t.id), nome: t.nome ?? String(t.id) }));
  }, [turmasQuery.data, idTurmaOrigem]);

  const cloneMutation = useMutation({
    mutationFn: async () => {
      if (!toTurmaId) throw new Error('Selecione uma turma de destino.');
      if (!baseDate) throw new Error('Selecione a data base.');

      return liveSessionsService.cloneSessions({
        from_turma_id: Number(idTurmaOrigem),
        to_turma_id: Number(toTurmaId),
        base_date: baseDate,
      });
    },
    onSuccess: (data) => {
      toast({ title: '✅ Clonagem concluída', description: data.message });
      queryClient.invalidateQueries({ queryKey: ['live-sessions'] });
      onClose();
      setToTurmaId('');
      setBaseDate('');
    },
    onError: (e: any) => {
      const message = e.response?.data?.message || e.message || 'Ocorreu um erro ao clonar.';
      toast({ title: 'Erro ao clonar', description: message, variant: 'destructive' });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    cloneMutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={o => !o && onClose()}>
      <DialogContent className="sm:max-w-md rounded-2xl">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400">
              <Copy className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold">Clonar Aulas</DialogTitle>
              <DialogDescription className="text-sm">
                Copie as aulas da turma <strong className="text-foreground">{turmaOrigemNome || 'selecionada'}</strong> para outra.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          {/* Turma de Destino */}
          <div className="space-y-2">
            <Label className="font-bold flex items-center gap-2">Turma de Destino *</Label>
            <Select value={toTurmaId} onValueChange={setToTurmaId} disabled={turmasQuery.isFetching}>
              <SelectTrigger className="h-11 rounded-xl">
                <SelectValue placeholder={turmasQuery.isFetching ? 'Carregando turmas...' : 'Selecione a turma de destino...'} />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                {turmaOptions.length === 0 ? (
                  <div className="p-3 text-sm text-muted-foreground text-center">Nenhuma outra turma encontrada.</div>
                ) : (
                  turmaOptions.map((t: any) => (
                    <SelectItem key={t.id} value={t.id}>{t.nome}</SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          {/* Data Base */}
          <div className="space-y-2">
            <Label className="font-bold flex items-center gap-2">Data da Primeira Aula na Nova Turma *</Label>
            <p className="text-[11px] text-muted-foreground leading-tight mb-2">
              Esta data servirá como âncora. As datas de <strong>todas as atividades</strong> serão reajustadas automaticamente mantendo os mesmos intervalos e horários originais.
            </p>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                type="date"
                required
                className="h-11 rounded-xl pl-9"
                value={baseDate}
                onChange={e => setBaseDate(e.target.value)}
              />
            </div>
          </div>

          {/* Aviso */}
          <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/50 rounded-xl p-3 flex gap-3 text-amber-800 dark:text-amber-300 mt-2">
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <div className="text-xs font-medium leading-relaxed">
              Títulos, descrições e durações serão copiados. Os links de videoconferência serão esvaziados nas aulas clonadas para evitar conflitos, você poderá adicioná-los posteriormente.
            </div>
          </div>

          <DialogFooter className="pt-4">
            <Button type="button" variant="ghost" onClick={onClose} disabled={cloneMutation.isPending} className="rounded-xl font-bold">
              Cancelar
            </Button>
            <Button type="submit" disabled={cloneMutation.isPending || !toTurmaId || !baseDate} className="h-11 px-6 rounded-xl font-bold shadow-lg bg-indigo-600 hover:bg-indigo-700 text-white">
              {cloneMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Copy className="w-4 h-4 mr-2" />}
              Clonar Atividades
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
