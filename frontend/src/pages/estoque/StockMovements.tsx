import { useState } from 'react';
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Search } from 'lucide-react';
import { useStockMovements, useCancelStockEntry } from '@/hooks/stock';
import { toast } from 'sonner';
import type { StockMovement } from '@/types/stock';

/**
 * StockMovements — Livro de movimentações de estoque.
 * pt-BR: Histórico de entradas/saídas com filtros, origem (ordem de serviço)
 * e ação de estorno quando a linha pertence a um lançamento processado.
 */
export default function StockMovements() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [type, setType] = useState<'entrada' | 'saida' | 'all'>('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const { data, isLoading, refetch } = useStockMovements({
    limit: 50,
    type: type !== 'all' ? type : undefined,
    search: search || undefined,
    date_from: dateFrom || undefined,
    date_to: dateTo || undefined,
  });

  const cancelMutation = useCancelStockEntry({
    onSuccess: () => {
      toast.success('Lançamento estornado (estoque revertido).');
      refetch();
    },
    onError: (e: any) => toast.error(e?.message || 'Erro ao estornar lançamento.'),
  });

  const movements: StockMovement[] = data?.data ?? [];

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Movimentações de estoque</h1>
        <p className="text-sm text-muted-foreground">
          Livro auxiliar de entradas e saídas — auxílio logístico interno.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
          <CardDescription>Filtre pelo histórico de movimentações.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-4">
          <div className="relative sm:col-span-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar produto..."
              className="pl-9"
            />
          </div>
          <Select value={type} onValueChange={(v) => setType(v as typeof type)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os tipos</SelectItem>
              <SelectItem value="entrada">Entradas</SelectItem>
              <SelectItem value="saida">Saídas</SelectItem>
            </SelectContent>
          </Select>
          <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
          <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          {isLoading ? (
            <div className="py-10 text-center text-muted-foreground">Carregando movimentações...</div>
          ) : movements.length === 0 ? (
            <div className="py-10 text-center text-muted-foreground">Nenhuma movimentação encontrada.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="pb-2 font-medium">Data</th>
                    <th className="pb-2 font-medium">Produto</th>
                    <th className="pb-2 font-medium">Tipo</th>
                    <th className="pb-2 font-medium">Qtd.</th>
                    <th className="pb-2 font-medium">Custo unit.</th>
                    <th className="pb-2 font-medium">Origem</th>
                    <th className="pb-2 font-medium">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {movements.map((m) => (
                    <tr key={m.id} className="border-b last:border-0">
                      <td className="py-3 whitespace-nowrap text-muted-foreground">
                        {m.created_at ? new Date(m.created_at).toLocaleString('pt-BR') : '-'}
                      </td>
                      <td className="py-3 font-medium">{m.product_name ?? `#${m.product_id}`}</td>
                      <td className="py-3">
                        {m.type === 'entrada' ? (
                          <Badge variant="default">Entrada</Badge>
                        ) : (
                          <Badge variant="secondary">Saída</Badge>
                        )}
                      </td>
                      <td className="py-3 font-semibold">{m.quantity}</td>
                      <td className="py-3">
                        {m.unit_cost != null
                          ? Number(m.unit_cost).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
                          : '—'}
                      </td>
                      <td className="py-3 text-muted-foreground">
                        {m.service_order_id ? `Ordem de serviço #${m.service_order_id}` : m.entry_document || m.reason || '—'}
                      </td>
                      <td className="py-3">
                        {m.entry_status === 'processada' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            disabled={cancelMutation.isPending}
                            onClick={() => cancelMutation.mutate(Number(m.entry_id ?? 0))}
                          >
                            Estornar
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}