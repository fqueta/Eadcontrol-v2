import { useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { ModuleForm } from '@/components/school/ModuleForm';
import { modulesService } from '@/services/modulesService';
import type { ModulePayload } from '@/types/modules';
import { useToast } from '@/hooks/use-toast';
import { ChevronLeft, BookOpen, PlusCircle } from 'lucide-react';

/**
 * ModuleCreate — Página de criação de módulo
 * pt-BR: Cria um novo módulo com visual premium.
 * en-US: Creates a new module with premium visuals.
 */
const ModuleCreate = () => {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { toast } = useToast();

  const createMutation = useMutation({
    mutationFn: async (payload: ModulePayload) => modulesService.create(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['modules', 'list'] });
      toast({
        title: "Módulo criado!",
        description: "O novo módulo foi cadastrado com sucesso.",
      });
      navigate('/admin/school/modules');
    },
    onError: () => {
      toast({
        title: "Erro ao criar",
        description: "Não foi possível cadastrar o módulo.",
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
            <span className="text-primary italic">Cadastro</span>
          </div>
          <h1 className="text-3xl font-black tracking-tight text-foreground flex items-center gap-3">
            <PlusCircle className="h-8 w-8 text-primary" />
            Novo Módulo
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
          onSubmit={(v) => createMutation.mutate(v)} 
          isEditing={false}
        />
      </div>
    </div>
  );
};

export default ModuleCreate;