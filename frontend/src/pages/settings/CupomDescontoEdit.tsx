import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronLeft, Loader2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import CupomDescontoForm, { CupomFormValues } from './CupomDescontoForm';
import { cupomService } from '@/services/cupomService';

export default function CupomDescontoEdit() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();

  const { data: cupom, isLoading } = useQuery({
    queryKey: ['cupons', 'getById', id],
    queryFn: () => cupomService.getById(Number(id)),
    enabled: !!id,
  });

  const mutation = useMutation({
    mutationFn: (data: CupomFormValues) => cupomService.update(Number(id), data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cupons', 'list'] });
      queryClient.invalidateQueries({ queryKey: ['cupons', 'getById', id] });
      toast({ title: "Cupom atualizado com sucesso!" });
      navigate('/admin/settings/cupom-desconto');
    },
    onError: (err: any) => {
      const msg = err.response?.data?.message || err.response?.data?.errors?.codigo?.[0] || "Erro ao atualizar cupom";
      toast({ title: "Erro", description: msg, variant: "destructive" });
    },
  });

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Editar Cupom</h1>
          <p className="text-sm text-muted-foreground">Altere os dados do cupom de desconto.</p>
        </div>
        <Button variant="outline" onClick={() => navigate('/admin/settings/cupom-desconto')}>
          <ChevronLeft className="w-4 h-4 mr-2" /> Voltar
        </Button>
      </div>
      <Card>
        <CardContent className="p-6">
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <CupomDescontoForm
              initialData={cupom}
              onSubmit={(data) => mutation.mutate(data)}
              isSubmitting={mutation.isPending}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
