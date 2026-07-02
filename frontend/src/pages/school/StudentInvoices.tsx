import { useQuery } from '@tanstack/react-query';
import InclusiveSiteLayout from '@/components/layout/InclusiveSiteLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Receipt, CheckCircle, AlertCircle, Calendar } from 'lucide-react';
import { usersService } from '@/services/usersService';
import { formatDate } from '@/lib/utils';

export default function StudentInvoices() {
  const { data: invoices, isLoading } = useQuery({
    queryKey: ['my-invoices'],
    queryFn: () => usersService.getMyInvoices(),
  });

  const formatCurrencyBRL = (value: number): string => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(value) || 0);
  };

  const totals = (invoices || []).reduce(
    (acc, inv) => {
      if (inv.status === 'paid') acc.paid++;
      else if (new Date(inv.due_date) < new Date()) acc.overdue++;
      else acc.pending++;
      return acc;
    },
    { paid: 0, pending: 0, overdue: 0 }
  );

  return (
    <InclusiveSiteLayout>
      <div className="container mx-auto p-4 md:p-8 space-y-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Minhas Faturas</h1>
          <p className="text-muted-foreground">Acompanhe as faturas vinculadas à sua conta.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="border-0 shadow-sm ring-1 ring-black/5">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <Receipt className="w-5 h-5 text-amber-500" />
                <CardTitle className="text-base text-foreground">Em Aberto</CardTitle>
              </div>
              <CardDescription>Faturas aguardando pagamento</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-black text-amber-600">
                {isLoading ? '...' : totals.pending}
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm ring-1 ring-black/5">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-emerald-500" />
                <CardTitle className="text-base text-foreground">Pagas</CardTitle>
              </div>
              <CardDescription>Faturas quitadas</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-black text-emerald-600">
                {isLoading ? '...' : totals.paid}
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm ring-1 ring-black/5">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-red-500" />
                <CardTitle className="text-base text-foreground">Vencidas</CardTitle>
              </div>
              <CardDescription>Faturas em atraso</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-black text-red-600">
                {isLoading ? '...' : totals.overdue}
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="border-0 shadow-sm ring-1 ring-black/5 overflow-hidden">
          <CardHeader className="bg-muted/30 border-b">
            <CardTitle>Histórico de Faturas</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-8 text-center text-muted-foreground animate-pulse">Carregando faturas...</div>
            ) : invoices && invoices.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-muted/10 border-b text-xs font-bold text-muted-foreground uppercase tracking-wider">
                      <th className="py-4 px-6">Descrição</th>
                      <th className="py-4 px-6">Vencimento</th>
                      <th className="py-4 px-6 text-right">Valor</th>
                      <th className="py-4 px-6 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y text-sm">
                    {invoices.map((inv) => {
                      const isOverdue = inv.status !== 'paid' && new Date(inv.due_date) < new Date();
                      
                      const statusColor = inv.status === 'paid' 
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-100' 
                        : isOverdue 
                          ? 'bg-red-50 text-red-700 border-red-100' 
                          : 'bg-amber-50 text-amber-700 border-amber-100';
                      
                      const statusLabel = inv.status === 'paid' 
                        ? 'Paga' 
                        : isOverdue 
                          ? 'Vencida' 
                          : 'Pendente';

                      return (
                        <tr key={inv.id} className="hover:bg-muted/30 transition-colors">
                          <td className="py-4 px-6">
                            <div className="font-bold text-foreground">{inv.description || 'Fatura Geral'}</div>
                            <div className="text-xs text-muted-foreground mt-0.5">#{inv.invoice_number || inv.id}</div>
                          </td>
                          <td className="py-4 px-6 font-medium flex items-center gap-2 text-muted-foreground">
                            <Calendar className="h-4 w-4" /> {formatDate(inv.due_date)}
                          </td>
                          <td className="py-4 px-6 text-right font-black text-foreground">
                            {formatCurrencyBRL(inv.amount)}
                          </td>
                          <td className="py-4 px-6 text-center">
                            <Badge variant="outline" className={`${statusColor} font-bold`}>
                              {statusLabel}
                            </Badge>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-12 text-center">
                <Receipt className="mx-auto h-12 w-12 text-muted-foreground/30 mb-4" />
                <p className="text-lg font-medium text-foreground">Nenhuma fatura encontrada.</p>
                <p className="text-sm text-muted-foreground">Você não possui histórico financeiro neste momento.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </InclusiveSiteLayout>
  );
}