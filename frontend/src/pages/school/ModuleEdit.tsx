import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { ModuleForm } from '@/components/school/ModuleForm';
import { modulesService } from '@/services/modulesService';
import type { ModulePayload, ModuleRecord } from '@/types/modules';
import { useToast } from '@/hooks/use-toast';
import { ChevronLeft, BookOpen, Settings2 } from 'lucide-react';

/**
 * ModuleEdit — Página de edição de módulo
 * pt-BR: Edita módulo existente com visual premium.
 * en-US: Edits existing module with premium visuals.
 */
const ModuleEdit = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const qc = useQueryClient();
  const { toast } = useToast();

  const detailsQuery = useQuery({
    queryKey: ['modules', 'getById', id],
    queryFn: async () => modulesService.getById(String(id)),
    enabled: !!id,
  });

  const updateMutation = useMutation({
    mutationFn: async (payload: ModulePayload) => modulesService.update(String(id), payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['modules', 'list'] });
      toast({
        title: "Alterações salvas!",
        description: "As configurações do módulo foram atualizadas.",
      });
      navigate('/admin/school/modules');
    },
    onError: () => {
      toast({
        title: "Erro ao salvar",
        description: "Não foi possível atualizar o módulo.",
        variant: "destructive"
      });
    }
  });

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-muted-foreground/60">
            <BookOpen className="h-3 w-3" />
            Módulos
            <span className="text-primary/40">•</span>
            <span className="text-primary italic">Edição</span>
          </div>
          <h1 className="text-3xl font-black tracking-tight text-foreground flex items-center gap-3">
            <Settings2 className="h-8 w-8 text-primary" />
            Editar Módulo
          </h1>
        </div>
        <Button 
          variant="outline" 
          onClick={() => navigate('/admin/school/modules')}
          className="h-11 rounded-xl border-slate-200 font-bold px-6 hover:bg-slate-50 transition-all gap-2"
        >
          <ChevronLeft className="h-4 w-4" />
          Voltar para Lista
        </Button>
      </div>

      <div className="rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-800 p-1">
        <ModuleForm 
          initialData={detailsQuery.data as ModuleRecord} 
          onSubmit={(v) => updateMutation.mutate(v)} 
          isEditing={true}
        />
      </div>
    </div>
  );
};

export default ModuleEdit;