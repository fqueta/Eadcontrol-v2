import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, UserPlus } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { UserForm } from '@/components/users/UserForm';
import { usePermissionsList } from '@/hooks/permissions';
import { useCreateUser } from '@/hooks/users';
import { CreateUserInput } from '@/types/users';
import { toast } from '@/hooks/use-toast';

// Schema simplificado apenas com os campos que aparecem na imagem
const userCreateSchema = z.object({
  // Tipo de pessoa fixo: PF
  tipo_pessoa: z.literal('pf').default('pf'),
  permission_id: z.coerce.string().min(1, 'Permissão é obrigatória'),
  name: z.string().min(1, 'Nome é obrigatório'),
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'Senha deve ter pelo menos 6 caracteres'),
  ativo: z.enum(['s', 'n']).default('s'),
  config: z.object({
    celular: z.string().nullable().optional(),
    telefone_comercial: z.string().nullable().optional(),
    nascimento: z.string().nullable().optional(),
    cep: z.string().nullable().optional(),
    endereco: z.string().nullable().optional(),
    numero: z.string().nullable().optional(),
    complemento: z.string().nullable().optional(),
    bairro: z.string().nullable().optional(),
    cidade: z.string().nullable().optional(),
  }).default({
    celular: '',
    telefone_comercial: '',
    nascimento: '',
    cep: '',
    endereco: '',
    numero: '',
    complemento: '',
    bairro: '',
    cidade: '',
  }),
});

type UserCreateFormData = z.infer<typeof userCreateSchema>;

/**
 * UserCreate Page
 * pt-BR: Página dedicada para cadastro de usuário. Refatorada com visual moderno.
 * en-US: Dedicated page for user registration. Refactored with modern look.
 */
export default function UserCreate() {
  const navigate = useNavigate();
  const createMutation = useCreateUser();
  const { data: permissionsData, isLoading: isLoadingPermissions } = usePermissionsList({ per_page: 100 });
  const permissions = permissionsData?.data || [];

  const form = useForm<UserCreateFormData>({
    resolver: zodResolver(userCreateSchema),
    defaultValues: {
      tipo_pessoa: 'pf',
      permission_id: '',
      name: '',
      email: '',
      password: '',
      ativo: 's',
      config: {
        celular: '',
        telefone_comercial: '',
        nascimento: '',
        cep: '',
        endereco: '',
        numero: '',
        complemento: '',
        bairro: '',
        cidade: '',
      },
    },
  });

  // Preenche automaticamente a primeira permissão carregada, se existir
  useEffect(() => {
    const first = permissions[0]?.id;
    if (first && !form.getValues('permission_id')) {
      form.setValue('permission_id', String(first));
    }
  }, [permissions]);

  const onSubmit = async (data: UserCreateFormData) => {
    const payload: CreateUserInput = {
      tipo_pessoa: 'pf',
      permission_id: data.permission_id,
      email: data.email,
      password: data.password,
      name: data.name,
      genero: 'ni',
      ativo: data.ativo,
      token: '',
      config: {
        nome_fantasia: '',
        celular: data.config.celular || '',
        telefone_residencial: '',
        telefone_comercial: data.config.telefone_comercial || '',
        rg: '',
        nascimento: data.config.nascimento || '',
        escolaridade: '',
        profissao: '',
        tipo_pj: '',
        cep: data.config.cep || '',
        endereco: data.config.endereco || '',
        numero: data.config.numero || '',
        complemento: data.config.complemento || '',
        bairro: data.config.bairro || '',
        cidade: data.config.cidade || '',
        uf: '',
      },
    };

    try {
      await createMutation.mutateAsync(payload);
      toast({ title: 'Usuário criado', description: 'Cadastro realizado com sucesso.' });
      navigate('/admin/settings/users');
    } catch (err: any) {
      toast({ title: 'Erro ao criar usuário', description: err?.message || 'Tente novamente.', variant: 'destructive' });
    }
  };

  const onCancel = () => navigate('/admin/settings/users');

  return (
    <div className="container-fluid py-8 px-4 md:px-8 space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col gap-4">
        <Button 
          variant="ghost" 
          onClick={onCancel} 
          className="w-fit gap-2 -ml-2 text-muted-foreground hover:text-primary"
        >
          <ChevronLeft className="h-4 w-4" />
          Voltar para lista
        </Button>
        
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg text-primary">
            <UserPlus className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">Novo Usuário</h1>
            <p className="text-muted-foreground">Preencha os dados abaixo para criar um novo acesso ao sistema.</p>
          </div>
        </div>
      </div>

      <Card className="border-none shadow-xl bg-white dark:bg-zinc-900 overflow-hidden">
        <CardContent className="p-8">
          <UserForm
            form={form}
            onSubmit={onSubmit}
            onCancel={onCancel}
            editingUser={null}
            permissions={permissions}
            isLoadingPermissions={isLoadingPermissions}
            showTipoPessoa={false}
            showGenero={false}
            showAddressSection={true}
            showCpf={false}
            showPhones={true}
            ativoAsSwitch={true}
            showBirthDate={true}
          />
        </CardContent>
      </Card>
    </div>
  );
}