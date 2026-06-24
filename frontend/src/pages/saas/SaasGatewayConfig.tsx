import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Settings, Plus, Pencil, Trash2, Check, X } from 'lucide-react';
import { saasService, SaasGatewayConfig } from '@/services/saasService';
import { useToast } from '@/hooks/use-toast';

export default function SaasGatewayConfigPage() {
  const { toast } = useToast();
  const [configs, setConfigs] = useState<SaasGatewayConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Partial<SaasGatewayConfig> | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadConfigs();
  }, []);

  async function loadConfigs() {
    try {
      setLoading(true);
      const res = await saasService.getGatewayConfigs();
      setConfigs(res);
    } catch (error: any) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }

  function openCreate() {
    setEditing({
      provider: 'asaas',
      api_key: '',
      environment: 'sandbox',
      webhook_secret: '',
      active: false,
    });
    setDialogOpen(true);
  }

  function openEdit(config: SaasGatewayConfig) {
    setEditing({ ...config });
    setDialogOpen(true);
  }

  async function handleSave() {
    if (!editing?.provider) {
      toast({ title: 'Provider é obrigatório.', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      if ((editing as any).id) {
        await saasService.updateGatewayConfig(editing.provider!, {
          api_key: editing.api_key,
          environment: editing.environment,
          webhook_secret: editing.webhook_secret,
          active: editing.active,
        });
        toast({ title: 'Configuração atualizada com sucesso.' });
      } else {
        await saasService.createGatewayConfig(editing as any);
        toast({ title: 'Configuração criada com sucesso.' });
      }
      setDialogOpen(false);
      loadConfigs();
    } catch (error: any) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(config: SaasGatewayConfig) {
    if (!confirm(`Remover configuração do provider "${config.provider}"?`)) return;
    try {
      await saasService.deleteGatewayConfig(config.provider);
      toast({ title: 'Configuração removida.' });
      loadConfigs();
    } catch (error: any) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    }
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Settings className="h-6 w-6 text-primary" />
            Gateway de Pagamento
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Configure as credenciais do gateway financeiro para cobrança das assinaturas SaaS.
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4 mr-2" />
          Nova Configuração
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Provider</TableHead>
                <TableHead>Ambiente</TableHead>
                <TableHead>API Key</TableHead>
                <TableHead>Webhook Secret</TableHead>
                <TableHead>Ativo</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    Carregando...
                  </TableCell>
                </TableRow>
              ) : configs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    Nenhuma configuração de gateway encontrada.
                  </TableCell>
                </TableRow>
              ) : (
                configs.map((config) => (
                  <TableRow key={config.id}>
                    <TableCell className="font-medium capitalize">{config.provider}</TableCell>
                    <TableCell>
                      <Badge variant={config.environment === 'production' ? 'default' : 'secondary'}>
                        {config.environment === 'production' ? 'Produção' : 'Sandbox'}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {config.api_key ? `${config.api_key.substring(0, 8)}...` : '—'}
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {config.webhook_secret ? `${config.webhook_secret.substring(0, 8)}...` : '—'}
                    </TableCell>
                    <TableCell>
                      {config.active ? (
                        <Check className="h-5 w-5 text-emerald-500" />
                      ) : (
                        <X className="h-5 w-5 text-muted-foreground" />
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" onClick={() => openEdit(config)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(config)}>
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

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editing?.id ? 'Editar' : 'Nova'} Configuração de Gateway</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Provider</Label>
              <Select
                value={editing?.provider || 'asaas'}
                onValueChange={(v) => setEditing({ ...editing, provider: v })}
                disabled={!!editing?.id}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="asaas">Asaas</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Ambiente</Label>
              <Select
                value={editing?.environment || 'sandbox'}
                onValueChange={(v) => setEditing({ ...editing, environment: v as 'sandbox' | 'production' })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sandbox">Sandbox (Testes)</SelectItem>
                  <SelectItem value="production">Produção</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>API Key</Label>
              <Input
                type="password"
                placeholder="asaas_..."
                value={editing?.api_key || ''}
                onChange={(e) => setEditing({ ...editing, api_key: e.target.value })}
              />
            </div>

            <div>
              <Label>Webhook Secret</Label>
              <Input
                type="password"
                placeholder="Webhook token de verificação"
                value={editing?.webhook_secret || ''}
                onChange={(e) => setEditing({ ...editing, webhook_secret: e.target.value })}
              />
            </div>

            <div className="flex items-center gap-3">
              <Switch
                checked={editing?.active || false}
                onCheckedChange={(v) => setEditing({ ...editing, active: v })}
              />
              <Label className="!mt-0">Ativo (usar esta configuração)</Label>
            </div>
          </div>
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
