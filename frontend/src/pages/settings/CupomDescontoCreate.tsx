import { useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronLeft } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import CupomDescontoForm, { CupomFormValues } from './CupomDescontoForm';
import { cupomService } from '@/services/cupomService';

export default function CupomDescontoCreate() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (data: CupomFormValues) => cupomService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cupons', 'list'] });
      toast({ title: "Cupom criado com sucesso!" });
      navigate('/admin/settings/cupom-desconto');
    },
    onError: (err: any) => {
      const msg = err.response?.data?.message || err.response?.data?.errors?.codigo?.[0] || "Erro ao criar cupom";
      toast({ title: "Erro", description: msg, variant: "destructive" });
    },
  });

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Novo Cupom</h1>
          <p className="text-sm text-muted-foreground">Preencha os dados para criar um novo cupom de desconto.</p>
        </div>
        <Button variant="outline" onClick={() => navigate('/admin/settings/cupom-desconto')}>
          <ChevronLeft className="w-4 h-4 mr-2" /> Voltar
        </Button>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Cadastro de Cupom</CardTitle>
          <CardDescription>Informe os detalhes do cupom de desconto.</CardDescription>
        </CardHeader>
        <CardContent>
          <CupomDescontoForm onSubmit={(data) => mutation.mutate(data)} isSubmitting={mutation.isPending} />
        </CardContent>
      </Card>
    </div>
  );
}
