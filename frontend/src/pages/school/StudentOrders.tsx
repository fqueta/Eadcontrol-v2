import InclusiveSiteLayout from '@/components/layout/InclusiveSiteLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { ShoppingCart, Clock, CheckCircle } from 'lucide-react';

/**
 * StudentOrders
 * pt-BR: Página placeholder para pedidos/ordens vinculados ao aluno.
 * en-US: Placeholder page for student orders linked to the account.
 */
export default function StudentOrders() {
  const { user } = useAuth();
  return (
    <InclusiveSiteLayout>
      <div className="container mx-auto p-4 space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Meus pedidos</h1>
          <p className="text-muted-foreground">Histórico de pedidos e ordens de serviço (a implementar)</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Resumo</CardTitle>
            <CardDescription>Implementação futura: listagem, busca e detalhes</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-muted-foreground">
              Usuário: {String(user?.name || '—')} • Em breve: integração com módulo de vendas/OS.
            </div>
          </CardContent>
        </Card>

        {/**
         * Summary cards
         * pt-BR: Cards de resumo de pedidos.
         * en-US: Orders summary cards.
         */}
        <Card>
          <CardHeader>
            <CardTitle>Resumo dos pedidos</CardTitle>
            <CardDescription>Contagens por status (em breve)</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Card className="p-0">
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-2">
                    <ShoppingCart className="w-4 h-4" />
                    <CardTitle className="text-base">Total</CardTitle>
                  </div>
                  <CardDescription>Pedidos vinculados</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-semibold">—</div>
                </CardContent>
              </Card>

              <Card className="p-0">
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    <CardTitle className="text-base">Em andamento</CardTitle>
                  </div>
                  <CardDescription>Processando</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-semibold">—</div>
                </CardContent>
              </Card>

              <Card className="p-0">
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4" />
                    <CardTitle className="text-base">Concluídos</CardTitle>
                  </div>
                  <CardDescription>Finalizados</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-semibold">—</div>
                </CardContent>
              </Card>
            </div>
          </CardContent>
        </Card>
      </div>
    </InclusiveSiteLayout>
  );
}