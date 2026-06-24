import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
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
import { Building2, Pencil, Plus, Search, Image } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { saasService, SaasTenant } from '@/services/saasService';
import { useToast } from '@/hooks/use-toast';

const emptyForm = {
  id: '',
  domain: '',
  name: '',
  email: '',
  cpf_cnpj: '',
  phone: '',
};

export default function SaasTenants() {
  const { toast } = useToast();
  const [tenants, setTenants] = useState<SaasTenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editing, setEditing] = useState<SaasTenant | null>(null);
  const [saving, setSaving] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  const [formData, setFormData] = useState({ ...emptyForm });
  const [editFormData, setEditFormData] = useState({
    domain: '',
    name: '',
    email: '',
    cpf_cnpj: '',
    phone: '',
    course_badge_position: 'top-right',
  });

  useEffect(() => {
    loadTenants();
  }, []);

  async function loadTenants() {
    try {
      setLoading(true);
      const res = await saasService.getTenants();
      setTenants(res.data);
    } catch (error: any) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }

  function openCreate() {
    setIsCreating(true);
    setFormData({ ...emptyForm });
    setDialogOpen(true);
  }

  function openEdit(tenant: SaasTenant) {
    setIsCreating(false);
    setEditing(tenant);
    setEditFormData({
      domain: tenant.domain || '',
      name: tenant.name || '',
      email: tenant.email || '',
      cpf_cnpj: tenant.cpf_cnpj || '',
      phone: tenant.phone || '',
      course_badge_position: tenant.course_badge_position || 'top-right',
    });
    setEditDialogOpen(true);
  }

  async function handleCreate() {
    if (!formData.id || !formData.domain) {
      toast({ title: 'ID e Domínio são obrigatórios.', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      await saasService.createTenant({
        id: formData.id,
        domain: formData.domain,
        name: formData.name || null,
        email: formData.email || null,
        cpf_cnpj: formData.cpf_cnpj || null,
        phone: formData.phone || null,
      });
      toast({ title: 'Tenant criado com sucesso.' });
      setDialogOpen(false);
      loadTenants();
    } catch (error: any) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  }

  async function handleUpdate() {
    if (!editing) return;
    setSaving(true);
    try {
      await saasService.updateTenant(editing.id, {
        domain: editFormData.domain || editing.domain,
        name: editFormData.name || editing.name,
        email: editFormData.email || null,
        cpf_cnpj: editFormData.cpf_cnpj || null,
        phone: editFormData.phone || null,
        course_badge_position: editFormData.course_badge_position,
      });
      toast({ title: 'Dados do tenant atualizados com sucesso.' });
      setEditDialogOpen(false);
      loadTenants();
    } catch (error: any) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  }

  const filtered = tenants.filter(t => {
    if (!search) return true;
    const q = search.toLowerCase();
    return t.name?.toLowerCase().includes(q) || t.id?.toLowerCase().includes(q) || t.domain?.toLowerCase().includes(q);
  });

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Building2 className="h-6 w-6 text-primary" />
            Tenants
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Gerencie os tenants e seus dados de cobrança (CPF/CNPJ, email, telefone).
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4 mr-2" />
          Novo Tenant
        </Button>
      </div>

      <div className="flex gap-3 items-end">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome, ID ou domínio..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Nome</TableHead>
                <TableHead>Domínio</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>CPF/CNPJ</TableHead>
                <TableHead>Telefone</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    Carregando...
                  </TableCell>
                </TableRow>
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    Nenhum tenant encontrado.
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((tenant) => (
                  <TableRow key={tenant.id}>
                    <TableCell className="font-mono text-xs">{tenant.id}</TableCell>
                    <TableCell className="font-medium">{tenant.name}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {tenant.domain || '—'}
                    </TableCell>
                    <TableCell>{tenant.email || '—'}</TableCell>
                    <TableCell className="font-mono text-xs">{tenant.cpf_cnpj || '—'}</TableCell>
                    <TableCell>{tenant.phone || '—'}</TableCell>
                    <TableCell>
                      <Badge variant={tenant.ativo === 's' ? 'default' : 'secondary'}>
                        {tenant.ativo === 's' ? 'Ativo' : 'Inativo'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(tenant)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Dialog Criar Tenant */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Novo Tenant</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>ID do Tenant *</Label>
                <Input
                  placeholder="ex: escola01"
                  value={formData.id}
                  onChange={(e) => setFormData({ ...formData, id: e.target.value })}
                />
              </div>
              <div>
                <Label>Domínio *</Label>
                <Input
                  placeholder="ex: escola01.meudominio.com"
                  value={formData.domain}
                  onChange={(e) => setFormData({ ...formData, domain: e.target.value })}
                />
              </div>
            </div>
            <div>
              <Label>Nome</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div>
              <Label>Email</Label>
              <Input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>
            <div>
              <Label>CPF / CNPJ</Label>
              <Input
                placeholder="000.000.000-00"
                value={formData.cpf_cnpj}
                onChange={(e) => setFormData({ ...formData, cpf_cnpj: e.target.value })}
              />
            </div>
            <div>
              <Label>Telefone</Label>
              <Input
                placeholder="(00) 00000-0000"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreate} disabled={saving}>
              {saving ? 'Criando...' : 'Criar Tenant'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Editar Tenant */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Dados do Tenant</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {editing?.id}
            </p>
            <div>
              <Label>Domínio</Label>
              <Input
                placeholder="ex: escola01.meudominio.com"
                value={editFormData.domain}
                onChange={(e) => setEditFormData({ ...editFormData, domain: e.target.value })}
              />
            </div>
            <div>
              <Label>Nome</Label>
              <Input
                value={editFormData.name}
                onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
              />
            </div>
            <div>
              <Label>Email</Label>
              <Input
                type="email"
                value={editFormData.email}
                onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
              />
            </div>
            <div>
              <Label>CPF / CNPJ</Label>
              <Input
                placeholder="000.000.000-00"
                value={editFormData.cpf_cnpj}
                onChange={(e) => setEditFormData({ ...editFormData, cpf_cnpj: e.target.value })}
              />
            </div>
            <div>
              <Label>Telefone</Label>
              <Input
                placeholder="(00) 00000-0000"
                value={editFormData.phone}
                onChange={(e) => setEditFormData({ ...editFormData, phone: e.target.value })}
              />
            </div>
            <div className="border-t pt-4">
              <Label className="flex items-center gap-2 mb-3">
                <Image className="h-4 w-4 text-primary" />
                Posição do badge de preço nos cards de curso
              </Label>
              <Select
                value={editFormData.course_badge_position}
                onValueChange={(v) => setEditFormData({ ...editFormData, course_badge_position: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="top-right">Canto Superior Direito</SelectItem>
                  <SelectItem value="top-left">Canto Superior Esquerdo</SelectItem>
                  <SelectItem value="top-center">Centro Superior</SelectItem>
                  <SelectItem value="bottom-right">Canto Inferior Direito</SelectItem>
                  <SelectItem value="bottom-left">Canto Inferior Esquerdo</SelectItem>
                  <SelectItem value="bottom-center">Centro Inferior</SelectItem>
                  <SelectItem value="hidden">Oculto</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleUpdate} disabled={saving}>
              {saving ? 'Salvando...' : 'Salvar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
