import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Plus, Pencil, Trash2, Package } from 'lucide-react';
import { saasService, SaasPlan } from '@/services/saasService';
import { useToast } from '@/hooks/use-toast';

const emptyPlan: Partial<SaasPlan> = {
  name: '',
  slug: '',
  description: '',
  price_monthly: 0,
  price_yearly: 0,
  active: true,
  is_free: false,
  trial_days: 14,
  sort_order: 0,
  features: { max_students: 50, max_courses: 5, max_storage_mb: 2048, max_users: 3 },
  usage_pricing: { extra_student: 1.5, extra_course: 10 },
};

export default function SaasPlans() {
  const { toast } = useToast();
  const [plans, setPlans] = useState<SaasPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<Partial<SaasPlan> | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadPlans();
  }, []);

  async function loadPlans() {
    try {
      setLoading(true);
      const res = await saasService.getAllPlans();
      setPlans(res.data);
    } catch (error: any) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }

  function openCreate() {
    setEditingPlan({ ...emptyPlan });
    setDialogOpen(true);
  }

  function openEdit(plan: SaasPlan) {
    setEditingPlan({ ...plan });
    setDialogOpen(true);
  }

  async function handleSave() {
    if (!editingPlan) return;
    setSaving(true);
    try {
      if (editingPlan.id) {
        await saasService.updatePlan(editingPlan.id, editingPlan);
        toast({ title: 'Plano atualizado com sucesso.' });
      } else {
        await saasService.createPlan(editingPlan);
        toast({ title: 'Plano criado com sucesso.' });
      }
      setDialogOpen(false);
      loadPlans();
    } catch (error: any) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(plan: SaasPlan) {
    if (!confirm(`Deseja excluir o plano "${plan.name}"?`)) return;
    try {
      await saasService.deletePlan(plan.id);
      toast({ title: 'Plano excluído com sucesso.' });
      loadPlans();
    } catch (error: any) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    }
  }

  function formatCurrency(value: number | null | undefined): string {
    if (!value && value !== 0) return '-';
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  }

  function updateField(field: string, value: any) {
    if (!editingPlan) return;
    setEditingPlan({ ...editingPlan, [field]: value });
  }

  function updateFeature(key: string, value: any) {
    if (!editingPlan) return;
    const features = { ...(editingPlan.features || {}), [key]: value };
    setEditingPlan({ ...editingPlan, features });
  }

  function updateUsagePricing(key: string, value: number) {
    if (!editingPlan) return;
    const usage_pricing = { ...(editingPlan.usage_pricing || {}), [key]: value };
    setEditingPlan({ ...editingPlan, usage_pricing });
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Package className="h-6 w-6 text-primary" />
            Planos de Assinatura
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Configure os planos disponíveis para os tenants.
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4 mr-2" />
          Novo Plano
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Preço Mensal</TableHead>
                <TableHead>Preço Anual</TableHead>
                <TableHead>Trial</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Limites</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    Carregando...
                  </TableCell>
                </TableRow>
              ) : plans.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    Nenhum plano cadastrado.
                  </TableCell>
                </TableRow>
              ) : (
                plans.map((plan) => (
                  <TableRow key={plan.id}>
                    <TableCell>
                      <div>
                        <span className="font-medium">{plan.name}</span>
                        <br />
                        <span className="text-xs text-muted-foreground">{plan.slug}</span>
                      </div>
                    </TableCell>
                    <TableCell className="font-semibold">{formatCurrency(plan.price_monthly)}</TableCell>
                    <TableCell>{formatCurrency(plan.price_yearly)}</TableCell>
                    <TableCell>{plan.trial_days} dias</TableCell>
                    <TableCell>
                      <Badge variant={plan.active ? 'default' : 'secondary'}>
                        {plan.active ? 'Ativo' : 'Inativo'}
                      </Badge>
                      {plan.is_free && (
                        <Badge variant="outline" className="ml-1">
                          Gratuito
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-xs">
                      {plan.features && (
                        <div className="space-y-0.5">
                          <div>Alunos: {plan.features.max_students === -1 ? '∞' : plan.features.max_students}</div>
                          <div>Cursos: {plan.features.max_courses === -1 ? '∞' : plan.features.max_courses}</div>
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" onClick={() => openEdit(plan)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(plan)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Dialog de Criação/Edição */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingPlan?.id ? 'Editar Plano' : 'Novo Plano'}</DialogTitle>
          </DialogHeader>
          {editingPlan && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Nome</Label>
                  <Input value={editingPlan.name || ''} onChange={(e) => updateField('name', e.target.value)} />
                </div>
                <div>
                  <Label>Slug</Label>
                  <Input value={editingPlan.slug || ''} onChange={(e) => updateField('slug', e.target.value)} placeholder="auto-gerado" />
                </div>
              </div>

              <div>
                <Label>Descrição</Label>
                <Textarea value={editingPlan.description || ''} onChange={(e) => updateField('description', e.target.value)} rows={2} />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label>Preço Mensal (R$)</Label>
                  <Input type="number" step="0.01" value={editingPlan.price_monthly || 0} onChange={(e) => updateField('price_monthly', parseFloat(e.target.value))} />
                </div>
                <div>
                  <Label>Preço Anual (R$)</Label>
                  <Input type="number" step="0.01" value={editingPlan.price_yearly || 0} onChange={(e) => updateField('price_yearly', parseFloat(e.target.value))} />
                </div>
                <div>
                  <Label>Dias de Trial</Label>
                  <Input type="number" value={editingPlan.trial_days || 0} onChange={(e) => updateField('trial_days', parseInt(e.target.value))} />
                </div>
              </div>

              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2">
                  <Switch checked={editingPlan.active ?? true} onCheckedChange={(v) => updateField('active', v)} />
                  <Label>Ativo</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch checked={editingPlan.is_free ?? false} onCheckedChange={(v) => updateField('is_free', v)} />
                  <Label>Gratuito</Label>
                </div>
              </div>

              {/* Features (Limites) */}
              <div>
                <Label className="text-sm font-semibold">Limites do Plano (-1 = Ilimitado)</Label>
                <div className="grid grid-cols-2 gap-3 mt-2">
                  <div>
                    <Label className="text-xs">Máx. Alunos</Label>
                    <Input type="number" value={editingPlan.features?.max_students ?? 0} onChange={(e) => updateFeature('max_students', parseInt(e.target.value))} />
                  </div>
                  <div>
                    <Label className="text-xs">Máx. Cursos</Label>
                    <Input type="number" value={editingPlan.features?.max_courses ?? 0} onChange={(e) => updateFeature('max_courses', parseInt(e.target.value))} />
                  </div>
                  <div>
                    <Label className="text-xs">Máx. Storage (MB)</Label>
                    <Input type="number" value={editingPlan.features?.max_storage_mb ?? 0} onChange={(e) => updateFeature('max_storage_mb', parseInt(e.target.value))} />
                  </div>
                  <div>
                    <Label className="text-xs">Máx. Usuários</Label>
                    <Input type="number" value={editingPlan.features?.max_users ?? 0} onChange={(e) => updateFeature('max_users', parseInt(e.target.value))} />
                  </div>
                </div>
              </div>

              {/* Usage Pricing */}
              <div>
                <Label className="text-sm font-semibold">Preço por Uso Extra (R$/unidade)</Label>
                <div className="grid grid-cols-2 gap-3 mt-2">
                  <div>
                    <Label className="text-xs">Por Aluno Extra</Label>
                    <Input type="number" step="0.01" value={editingPlan.usage_pricing?.extra_student ?? 0} onChange={(e) => updateUsagePricing('extra_student', parseFloat(e.target.value))} />
                  </div>
                  <div>
                    <Label className="text-xs">Por Curso Extra</Label>
                    <Input type="number" step="0.01" value={editingPlan.usage_pricing?.extra_course ?? 0} onChange={(e) => updateUsagePricing('extra_course', parseFloat(e.target.value))} />
                  </div>
                </div>
              </div>

              <div>
                <Label>Ordem de Exibição</Label>
                <Input type="number" value={editingPlan.sort_order || 0} onChange={(e) => updateField('sort_order', parseInt(e.target.value))} />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? 'Salvando...' : 'Salvar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
