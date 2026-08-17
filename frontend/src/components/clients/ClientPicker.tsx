import { useState, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { InputMask, format as formatMask } from '@react-input/mask';
import { Combobox } from '@/components/ui/combobox';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Pencil } from 'lucide-react';
import { useSearchClients } from '@/hooks/serviceOrders';
import { clientsService } from '@/services/clientsService';
import type { ClientRecord } from '@/types/clients';

/**
 * ClientPicker
 * pt-BR: Combobox de clientes com cadastro rápido e edição rápida do cliente selecionado.
 * A primeira opção é "Criar cadastro de cliente"; ao selecionar um cliente, um botão
 * de edição aparece ao lado para alterar rapidamente o cadastro.
 * en-US: Client combobox with quick-create and quick-edit of the selected client.
 */
export interface ClientPickerProps {
  /** ID do cliente selecionado (controlado) */
  value: string;
  /** Notifica a seleção. O segundo argumento é o cadastro detalhado quando disponível. */
  onValueChange: (value: string, client?: ClientRecord | null) => void;
  placeholder?: string;
  disabled?: boolean;
  /** Exibe a opção "Criar cadastro de cliente" (default true) */
  showQuickCreate?: boolean;
  /** Exibe o botão de editar o cliente selecionado (default true) */
  showEditButton?: boolean;
  onClientCreated?: (client: ClientRecord) => void;
  onClientUpdated?: (client: ClientRecord) => void;
  /** Query keys invalidadas após criar/editar (default: clients e search-clients) */
  queryKeysToInvalidate?: string[][];
}

const DEFAULT_QUERY_KEYS: string[][] = [['clients'], ['search-clients']];
const PHONE_MASK = '(__) _____-____';
const PHONE_REPLACEMENT = { _: /\d/ };

export function ClientPicker({
  value,
  onValueChange,
  placeholder = 'Selecione o cliente',
  disabled = false,
  showQuickCreate = true,
  showEditButton = true,
  onClientCreated,
  onClientUpdated,
  queryKeysToInvalidate = DEFAULT_QUERY_KEYS,
}: ClientPickerProps) {
  const queryClient = useQueryClient();
  const clientsSearch = useSearchClients();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [detail, setDetail] = useState<ClientRecord | null>(null);

  const options = useMemo(() => {
    const rows = (clientsSearch.data ?? []) as any[];
    const opts = rows.map((c) => ({
      value: String(c.id),
      label: c.name || 'Sem nome',
      description: [c.email, c.celular || c.config?.celular || c.config?.telefone_residencial].filter(Boolean).join(' • '),
    }));

    // Garante que o cliente já selecionado apareça mesmo fora da primeira página.
    if (value && !opts.some((o) => o.value === value)) {
      opts.unshift({ value, label: detail?.name || `Cliente #${value}`, description: '' });
    }

    if (showQuickCreate) {
      opts.unshift({ value: '__new__', label: 'Criar cadastro de cliente' });
    }

    return opts;
  }, [clientsSearch.data, value, detail, showQuickCreate]);

  const openCreate = () => {
    setEditingId(null);
    setName('');
    setEmail('');
    setPhone('');
    setDialogOpen(true);
  };

  const openEdit = () => {
    if (!value) return;
    setName(detail?.name ?? '');
    setEmail(detail?.email ?? '');
    setPhone(
      detail?.celular ||
      detail?.config?.celular ||
      detail?.config?.telefone_residencial ||
      detail?.config?.telefone_comercial ||
      ''
    );
    setEditingId(value);
    setDialogOpen(true);
  };

  const handleChange = (val: string) => {
    if (val === '__new__') {
      openCreate();
      return;
    }
    if (!val) {
      setDetail(null);
      onValueChange('', null);
      return;
    }
    const found = (clientsSearch.data as any[]).find((c) => String(c.id) === val);
    clientsService
      .getClient(val)
      .then((res) => {
        const rec = (res as unknown as { data?: ClientRecord }).data ?? (res as ClientRecord);
        setDetail(rec);
        onValueChange(val, rec);
      })
      .catch(() => {
        setDetail(found ? (found as ClientRecord) : null);
        onValueChange(val, found ? (found as ClientRecord) : null);
      });
  };

  const invalidate = () => {
    queryKeysToInvalidate.forEach((key) => queryClient.invalidateQueries({ queryKey: key }));
  };

  const handleSave = async () => {
    if (!name.trim()) return;
    setIsSaving(true);
    try {
      if (editingId) {
        const updated = await clientsService.updateClient(editingId, {
          name: name.trim(),
          email: email.trim() || '',
          config: {
            ...((detail?.config ?? {}) as any),
            celular: phone || '',
          },
        });
        invalidate();
        setDetail(updated);
        setName(updated?.name ?? '');
        setEmail(updated?.email ?? '');
        onClientUpdated?.(updated);
        toast.success('Cliente atualizado.');
      } else {
        const created = await clientsService.createClient({
          name: name.trim(),
          email: email.trim() || '',
          telefone: phone || '',
          tipo_pessoa: 'pf',
          config: {} as any,
          genero: 'ni',
          status: 'pre_registred',
        });
        invalidate();
        setDetail(created);
        onValueChange(String(created.id), created);
        onClientCreated?.(created);
        toast.success('Cliente criado.');
      }
      setDialogOpen(false);
      setEditingId(null);
    } catch (e: any) {
      toast.error(e?.message || 'Falha ao salvar cliente.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <div className="flex-1">
        <Combobox
          options={options}
          value={value}
          onValueChange={handleChange}
          placeholder={placeholder}
          searchPlaceholder="Buscar cliente..."
          emptyText="Nenhum cliente encontrado"
          disabled={disabled || clientsSearch.isLoading}
          loading={clientsSearch.isLoading}
          onSearch={clientsSearch.search}
          searchTerm={clientsSearch.searchTerm}
        />
      </div>

      {showEditButton && value && (
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={openEdit}
          disabled={disabled}
          className="h-10 w-10 shrink-0"
          title="Editar cadastro do cliente"
        >
          <Pencil className="h-4 w-4" />
        </Button>
      )}

      <Dialog open={dialogOpen} onOpenChange={(v) => { if (!v) { setDialogOpen(false); setEditingId(null); } }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Editar cadastro de cliente' : 'Criar cadastro de cliente'}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="space-y-2">
              <Label>Nome *</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nome do cliente" />
            </div>
            <div className="space-y-2">
              <Label>E-mail</Label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email@exemplo.com" />
            </div>
            <div className="space-y-2">
              <Label>Telefone</Label>
              <InputMask
                mask={PHONE_MASK}
                replacement={PHONE_REPLACEMENT}
                value={phone ? formatMask(phone, { mask: PHONE_MASK, replacement: PHONE_REPLACEMENT }) : ''}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="(00) 00000-0000"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => { setDialogOpen(false); setEditingId(null); }}>Cancelar</Button>
              <Button onClick={handleSave} disabled={isSaving || !name.trim()}>
                {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Salvar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default ClientPicker;
