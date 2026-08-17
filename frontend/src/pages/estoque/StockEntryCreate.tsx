import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Combobox } from '@/components/ui/combobox';
import { Loader2, Plus, Trash2, ArrowDownToLine, ArrowUpFromLine } from 'lucide-react';
import { useCreateStockEntry } from '@/hooks/stock';
import { useQuery } from '@tanstack/react-query';
import { productsService } from '@/services/productsService';
import type { StockEntryType, StockEntryItemPayload } from '@/types/stock';

/**
 * StockEntryCreate — Novo lançamento de estoque (auxílio logístico).
 * pt-BR: Registra nota interna de entrada/saída/ajuste com fornecedor, nº de
 * referência e múltiplos produtos. Não emite documento fiscal.
 */
export default function StockEntryCreate() {
  const navigate = useNavigate();
  const createEntry = useCreateStockEntry();

  const [type, setType] = useState<StockEntryType>('entrada');
  const [movementDate, setMovementDate] = useState(new Date().toISOString().slice(0, 10));
  const [supplierName, setSupplierName] = useState('');
  const [documentNumber, setDocumentNumber] = useState('');
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<Array<StockEntryItemPayload & { saved_label?: string }>>([]);

  const isIncome = type === 'inicial' || type === 'entrada';

  const { data: productsData } = useQuery({
    queryKey: ['products', 'list', 1],
    queryFn: () => productsService.listProducts({ page: 1, limit: 200 } as any),
  });
  const products: Array<{ value: string; label: string }> =
    (productsData?.data ?? []).map((p: any) => ({
      value: String(p.id ?? p.ID),
      label: p.name,
    }));

  const addItem = () => {
    setItems((prev) => [...prev, { product_id: 0, quantity: 1, line_type: 'entrada' as const }]);
  };

  const updateItem = (index: number, patch: Partial<StockEntryItemPayload & { saved_label?: string }>) => {
    setItems((prev) => prev.map((item, i) => (i === index ? { ...item, ...patch } : item)));
  };

  const removeItem = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const selectedValues = new Set(items.map((i) => String(i.product_id || '')).filter(Boolean));

  const handleSubmit = async () => {
    if (type === 'ajuste') {
      const noDirection = items.some((i) => !i.line_type);
      if (noDirection) {
        toast.error('Defina a direção (entrada/saída) de cada linha do ajuste.');
        return;
      }
    }

    const cleanItems = items
      .filter((i) => i.product_id)
      .map((i) => ({
        product_id: i.product_id,
        quantity: Number(i.quantity) || 1,
        line_type: i.line_type,
        unit_cost: isIncome && i.unit_cost != null ? Number(i.unit_cost) : undefined,
        reason: i.reason || undefined,
      }));

    if (cleanItems.length === 0) {
      toast.error('Adicione ao menos um produto ao lançamento.');
      return;
    }

    try {
      await createEntry.mutateAsync({
        type,
        movement_date: movementDate || new Date().toISOString().slice(0, 10),
        supplier_name: supplierName || null,
        document_number: documentNumber || null,
        notes: notes || null,
        items: cleanItems,
      });
      toast.success('Lançamento registrado com sucesso.');
      navigate('/admin/estoque');
    } catch (error: any) {
      toast.error(error?.message || 'Erro ao registrar lançamento.');
    }
  };

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Novo lançamento de estoque</h1>
        <p className="text-sm text-muted-foreground">
          Auxílio logístico interno — não emite documento fiscal.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Dados do lançamento</CardTitle>
          <CardDescription>Identificação da nota interna (entrada de compra, saída por consumo, ajuste).</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Tipo</Label>
            <Select value={type} onValueChange={(v) => setType(v as StockEntryType)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="inicial">Estoque inicial</SelectItem>
                <SelectItem value="entrada">Entrada</SelectItem>
                <SelectItem value="saida">Saída</SelectItem>
                <SelectItem value="ajuste">Ajuste</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Data</Label>
            <Input type="date" value={movementDate} onChange={(e) => setMovementDate(e.target.value)} />
          </div>
          {isIncome && (
            <>
              <div className="space-y-2">
                <Label>Fornecedor</Label>
                <Input value={supplierName} onChange={(e) => setSupplierName(e.target.value)} placeholder="Nome do fornecedor" />
              </div>
              <div className="space-y-2">
                <Label>Nº de referência externa</Label>
                <Input value={documentNumber} onChange={(e) => setDocumentNumber(e.target.value)} placeholder="Ex.: NF do fornecedor (referência)" />
              </div>
            </>
          )}
          {!isIncome && (
            <div className="space-y-2 sm:col-span-2">
              <Label>Motivo da saída</Label>
              <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Ex.: consumo interno, avaria, doação..." />
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Produtos</CardTitle>
            <CardDescription>
              {isIncome ? 'Itens de entrada' : 'Itens de saída'}
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={addItem}>
            <Plus className="mr-2 h-4 w-4" /> Adicionar produto
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {items.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              Nenhum produto adicionado. Clique em “Adicionar produto”.
            </p>
          ) : (
            items.map((item, index) => (
              <div key={index} className="flex flex-col gap-3 rounded-lg border p-3 sm:flex-row sm:items-end">
                <div className="flex-1 space-y-1.5">
                  <Label>Produto</Label>
                  <Combobox
                    options={products.filter(
                      (p) => !selectedValues.has(p.value) || String(item.product_id) === p.value
                    )}
                    onValueChange={(value) => {
                      const option = products.find((p) => p.value === value);
                      updateItem(index, { product_id: Number(value), saved_label: option?.label });
                    }}
                    value={item.product_id ? String(item.product_id) : ''}
                    placeholder="Buscar produto..."
                    emptyText="Nenhum produto encontrado"
                  />
                </div>
                <div className="w-24 space-y-1.5">
                  <Label>Qtd.</Label>
                  <Input
                    type="number"
                    min={1}
                    value={item.quantity}
                    onChange={(e) => updateItem(index, { quantity: Number(e.target.value) })}
                  />
                </div>
                {isIncome && (
                  <div className="w-28 space-y-1.5">
                    <Label>Custo unit.</Label>
                    <Input
                      type="number"
                      step="0.01"
                      min={0}
                      value={item.unit_cost ?? ''}
                      onChange={(e) => updateItem(index, { unit_cost: Number(e.target.value) })}
                      placeholder="0,00"
                    />
                  </div>
                )}
                {type === 'ajuste' && (
                  <div className="w-32 space-y-1.5">
                    <Label>Direção</Label>
                    <Select
                      value={item.line_type}
                      onValueChange={(v) => updateItem(index, { line_type: v as 'entrada' | 'saida' })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="entrada">
                          <span className="flex items-center gap-1"><ArrowDownToLine className="h-4 w-4" /> Entrada</span>
                        </SelectItem>
                        <SelectItem value="saida">
                          <span className="flex items-center gap-1"><ArrowUpFromLine className="h-4 w-4" /> Saída</span>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
                <Button variant="ghost" size="icon" onClick={() => removeItem(index)} aria-label="Remover item">
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <div className="flex justify-end gap-3">
        <Button variant="outline" onClick={() => navigate('/admin/estoque')}>
          Cancelar
        </Button>
        <Button onClick={handleSubmit} disabled={createEntry.isPending}>
          {createEntry.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Registrar lançamento
        </Button>
      </div>
    </div>
  );
}