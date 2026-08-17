import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDebounce } from '@/hooks/useDebounce';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Search, Package, AlertTriangle, Plus, ClipboardList } from 'lucide-react';
import { useStockSummary } from '@/hooks/stock';

/**
 * Inventory — Estoque (auxílio logístico).
 * pt-BR: Resumo de saldo por produto com custo médio, alerta de mínimo e
 * acesso ao lançamento de entradas/saídas e ao livro de movimentações.
 */
export default function Inventory() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [onlyLow, setOnlyLow] = useState(false);
  const debouncedSearch = useDebounce(search, 300);

  const { data: items = [], isLoading } = useStockSummary({
    search: debouncedSearch || undefined,
    only_low: onlyLow || undefined,
  });

  const lowCount = items.filter((i) => i.low).length;
  const totalValue = items.reduce((sum, i) => sum + (Number(i.total_cost) || 0), 0);

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Estoque</h1>
          <p className="text-sm text-muted-foreground">
            Auxílio logístico interno — não emite documento fiscal.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => navigate('/admin/estoque/movements')}>
            <ClipboardList className="mr-2 h-4 w-4" /> Movimentações
          </Button>
          <Button onClick={() => navigate('/admin/estoque/create')}>
            <Plus className="mr-2 h-4 w-4" /> Novo lançamento
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <Package className="h-4 w-4" /> Produtos ativos
            </CardDescription>
            <CardTitle className="text-3xl">{items.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" /> Abaixo do mínimo
            </CardDescription>
            <CardTitle className="text-3xl">{lowCount}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <Package className="h-4 w-4" /> Valor em estoque (custo)
            </CardDescription>
            <CardTitle className="text-3xl">
              {totalValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle>Resumo por produto</CardTitle>
            <CardDescription>Saldo calculado pelo livro de movimentações.</CardDescription>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar produto..."
                className="w-full pl-9 sm:w-64"
              />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <Switch checked={onlyLow} onCheckedChange={setOnlyLow} />
              Somente abaixo do mínimo
            </label>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="py-10 text-center text-muted-foreground">Carregando estoque...</div>
          ) : items.length === 0 ? (
            <div className="py-10 text-center text-muted-foreground">
              Nenhum produto encontrado. Cadastre produtos e ative o rastreamento de estoque no cadastro.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="pb-2 font-medium">Produto</th>
                    <th className="pb-2 font-medium">Saldo</th>
                    <th className="pb-2 font-medium">Mínimo</th>
                    <th className="pb-2 font-medium">Custo médio</th>
                    <th className="pb-2 font-medium">Valor (custo)</th>
                    <th className="pb-2 font-medium">Situação</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr key={item.product_id} className="border-b last:border-0">
                      <td className="py-3">
                        <button
                          className="text-left font-medium hover:underline"
                          onClick={() => navigate(`/admin/products/${item.product_id}`)}
                        >
                          {item.name}
                        </button>
                        {item.unit ? (
                          <span className="ml-2 text-xs text-muted-foreground">({item.unit})</span>
                        ) : null}
                      </td>
                      <td className="py-3 font-semibold">{item.balance}</td>
                      <td className="py-3 text-muted-foreground">{item.stock_min || '-'}</td>
                      <td className="py-3">
                        {item.average_cost?.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </td>
                      <td className="py-3">
                        {item.total_cost?.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </td>
                      <td className="py-3">
                        {item.low ? (
                          <Badge variant="destructive">Baixo</Badge>
                        ) : (
                          <Badge variant="secondary">OK</Badge>
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