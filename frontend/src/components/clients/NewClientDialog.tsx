import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Combobox } from '@/components/ui/combobox';
import { useUsersList } from '@/hooks/users';
import { useComboboxOptions } from '@/components/ui/combobox';
import { phoneApplyMask, phoneRemoveMask } from '@/lib/masks/phone-apply-mask';
import { clientsService } from '@/services/clientsService';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

interface NewClientDialogProps {
  onClientCreated: (client: any) => void;
  onCancel: () => void;
}

export default function NewClientDialog({ onClientCreated, onCancel }: NewClientDialogProps) {
  const { user } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [consultantId, setConsultantId] = useState(user?.id || '');
  const [emailError, setEmailError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [consultantSearchTerm, setConsultantSearchTerm] = useState('');

  const { data: consultantsPaginated, isLoading: isLoadingConsultants } = useUsersList(
    { consultores: true, per_page: 200, sort: 'name', search: consultantSearchTerm },
  );
  const consultantsList = useMemo(() => (consultantsPaginated?.data || consultantsPaginated?.items || []), [consultantsPaginated]);
  const consultantComboboxOptions = useComboboxOptions<any>(
    consultantsList,
    'id',
    'name',
    undefined,
    (u: any) => {
      const email = u?.email || '';
      return email || undefined;
    },
  );

  const isNameInvalid = name.trim().length === 0;
  const isPhoneInvalid = useMemo(() => {
    const len = phoneRemoveMask(phone).length;
    return len < 10 || len > 15;
  }, [phone]);

  const handleSubmit = async () => {
    if (isNameInvalid || isPhoneInvalid) {
      toast.error('Preencha nome e telefone válidos.');
      return;
    }
    try {
      setIsSubmitting(true);
      const payload: any = {
        autor: consultantId || undefined,
        config: {
          bairro: '', celular: '', cep: '', cidade: '', complemento: '', endereco: '',
          escolaridade: '', nascimento: '', nome_fantasia: '', numero: '', observacoes: '',
          profissao: '', rg: '', telefone_residencial: '', tipo_pj: '', uf: '',
        },
        email: email || '',
        telefone: phoneRemoveMask(phone) || '',
        genero: 'ni',
        name: name || '',
        password: 'ferqueta',
        status: 'actived',
        tipo_pessoa: 'pf',
      };
      const created = await clientsService.createClient(payload);
      onClientCreated(created);
      toast.success(`Cliente "${created.name}" cadastrado com sucesso!`);
    } catch (e: any) {
      const body = e?.body || e?.response?.data;
      if (body?.errors?.email) {
        setEmailError(body.errors.email[0]);
      } else {
        toast.error('Erro ao cadastrar cliente. Tente novamente.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs">Nome completo</label>
          <input
            className={`w-full rounded-md border p-2 text-sm ${isNameInvalid ? 'border-destructive' : ''}`}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ex.: João da Silva"
            aria-invalid={isNameInvalid}
          />
          {isNameInvalid && (
            <p className="text-xs text-destructive mt-1">Nome é obrigatório</p>
          )}
        </div>
        <div>
          <label className="text-xs">Email</label>
          <input
            type="email"
            className={`w-full rounded-md border p-2 text-sm ${emailError ? 'border-destructive' : ''}`}
            value={email}
            onChange={(e) => { setEmail(e.target.value); setEmailError(null); }}
            placeholder="email@exemplo.com"
            aria-invalid={!!emailError}
          />
          {emailError && (
            <p className="text-xs text-destructive mt-1">{emailError}</p>
          )}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs">Telefone</label>
          <input
            className={`w-full rounded-md border p-2 text-sm ${isPhoneInvalid ? 'border-destructive' : ''}`}
            value={phone}
            onChange={(e) => setPhone(phoneApplyMask(e.target.value))}
            placeholder="+55 (11) 99999-9999"
            aria-invalid={isPhoneInvalid}
          />
          {isPhoneInvalid && (
            <p className="text-xs text-destructive mt-1">Telefone inválido</p>
          )}
        </div>
        <div>
          <label className="text-xs">Consultor</label>
          <Combobox
            options={consultantComboboxOptions}
            value={consultantId}
            onValueChange={(v) => setConsultantId(v)}
            placeholder="Selecione um consultor"
            searchPlaceholder="Pesquisar consultores..."
            emptyText="Nenhum consultor encontrado."
            loading={isLoadingConsultants}
            onSearch={(term) => setConsultantSearchTerm(term)}
            className="text-sm"
          />
        </div>
      </div>
      <div className="flex items-center justify-end gap-2 pt-2">
        <Button variant="outline" onClick={onCancel} disabled={isSubmitting}>Cancelar</Button>
        <Button onClick={handleSubmit} disabled={isSubmitting}>
          {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Criar'}
        </Button>
      </div>
    </div>
  );
}
