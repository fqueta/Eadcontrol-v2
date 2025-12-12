import InclusiveSiteLayout from '@/components/layout/InclusiveSiteLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { Receipt, CheckCircle, AlertCircle } from 'lucide-react';

/**
 * StudentInvoices
 * pt-BR: Página placeholder para exibir faturas do aluno (a integrar com backend financeiro).
 * en-US: Placeholder page to show student invoices (to integrate with finance backend).
 */
export default function StudentInvoices() {
  const { user } = useAuth();
  return (
    <InclusiveSiteLayout>
      <div className="container mx-auto p-4 space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Minhas faturas</h1>
          <p className="text-muted-foreground">Visão geral de faturas vinculadas à sua conta</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Resumo</CardTitle>
            <CardDescription>Implementação futura: listagem paginada, filtros e status</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-muted-foreground">
              Usuário: {String(user?.name || '—')} • Este módulo será integrado posteriormente.
            </div>
          </CardContent>
        </Card>

        {/**
         * Summary cards
         * pt-BR: Cards de resumo por status de faturas.
         * en-US: Summary cards by invoice status.
         */}
        <Card>
          <CardHeader>
            <CardTitle>Resumo por status</CardTitle>
            <CardDescription>Em breve: contagens reais e filtros por período</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Card className="p-0">
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-2">
                    <Receipt className="w-4 h-4" />
                    <CardTitle className="text-base">Abertas</CardTitle>
                  </div>
                  <CardDescription>Faturas não pagas</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-semibold">—</div>
                </CardContent>
              </Card>

              <Card className="p-0">
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4" />
                    <CardTitle className="text-base">Pagas</CardTitle>
                  </div>
                  <CardDescription>Quitadas</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-semibold">—</div>
                </CardContent>
              </Card>

              <Card className="p-0">
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-4 h-4" />
                    <CardTitle className="text-base">Vencidas</CardTitle>
                  </div>
                  <CardDescription>Com atraso</CardDescription>
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