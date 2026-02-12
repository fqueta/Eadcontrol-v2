import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Pencil, Trash2, CalendarIcon, RotateCcw, AlertTriangle } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { format } from 'date-fns';
import { MaskedInputField } from '@/components/lib/MaskedInputField';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AddressAccordion } from "@/components/lib/AddressAccordion";
import { UserForm } from '@/components/users/UserForm';
import { Switch } from '@/components/ui/switch';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal } from "lucide-react";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Calendar } from '@/components/ui/calendar';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

import { 
  useUsersList, 
  useCreateUser, 
  useUpdateUser,
  useDeleteUser,
  useRestoreUser,
  useForceDeleteUser
} from '@/hooks/users';
import { usePermissionsList } from '@/hooks/permissions';
import { UserRecord, CreateUserInput } from '@/types/users';
import { toast } from '@/hooks/use-toast';

const userSchema = z.object({
  tipo_pessoa: z.enum(["pf", "pj"]).optional(),
  permission_id: z.coerce.string().min(1, 'Permissão é obrigatória'),
  email: z.string().email('Email inválido'),
  password: z.string().transform(val => val === "" ? undefined : val).optional().refine(val => val === undefined || val.length >= 6, {
    message: "Senha deve ter pelo menos 6 caracteres"
  }),
  name: z.string().min(1, 'Nome é obrigatório'),
  cpf: z.string().optional(),
  cnpj: z.string().optional(),
  // status: z.enum(["actived", "disabled"]),
  razao: z.string().optional(),
  genero: z.enum(["m", "f", "ni"]).optional(),
  ativo: z.enum(["s", "n"]).optional(),
  config: z.object({
    nome_fantasia: z.string().nullable().optional(),
    celular: z.string().nullable().optional(),
    telefone_residencial: z.string().nullable().optional(),
    telefone_comercial: z.string().nullable().optional(),
    rg: z.string().nullable().optional(),
    nascimento: z.string().nullable().optional(),
    escolaridade: z.string().nullable().optional(),
    profissao: z.string().nullable().optional(),
    tipo_pj: z.string().nullable().optional(),
    cep: z.string().nullable().optional(),
    endereco: z.string().nullable().optional(),
    numero: z.string().nullable().optional(),
    complemento: z.string().nullable().optional(),
    bairro: z.string().nullable().optional(),
    cidade: z.string().nullable().optional(),
    uf: z.string().nullable().optional(),
  }).optional(),
});

type UserFormData = z.infer<typeof userSchema>;

export default function Users() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserRecord | null>(null);
  const [deletingUser, setDeletingUser] = useState<UserRecord | null>(null);
  const [showTrash, setShowTrash] = useState(false);

  // When showTrash changes, reset page to 1
  useEffect(() => {
    setPage(1);
  }, [showTrash]);

  const { data: usersData, isLoading, error } = useUsersList({ 
    page, 
    per_page: 10,
    excluido: showTrash ? 's' : undefined
  });

  const { data: permissionsData, isLoading: isLoadingPermissions } = usePermissionsList();
  const permissions = permissionsData?.data || [];

  const createMutation = useCreateUser();
  const updateMutation = useUpdateUser();
  const deleteMutation = useDeleteUser();
  const restoreMutation = useRestoreUser();
  const forceDeleteMutation = useForceDeleteUser();

  const form = useForm<UserFormData>({
    resolver: zodResolver(userSchema),
    defaultValues: {
      tipo_pessoa: 'pf',
      permission_id: '',
      email: '',
      name: '',
      password: '',
      // status: 'actived',
      genero: 'ni',
      ativo: 's',
      config: {
        nome_fantasia: '',
        celular: '',
        telefone_residencial: '',
        telefone_comercial: '',
        rg: '',
        nascimento: '',
        escolaridade: '',
        profissao: '',
        tipo_pj: '',
        cep: '',
        endereco: '',
        numero: '',
        complemento: '',
        bairro: '',
        cidade: '',
        uf: '',
      },
    },
  });

  const users = usersData?.data || [];
  const totalPages = usersData?.last_page || 1;

  // Auto-fill permission_id when permissions load and field is empty
  useEffect(() => {
    const currentPermissionId = form.getValues('permission_id');
    
    if (!currentPermissionId && permissions.length > 0 && !editingUser) {
      form.setValue('permission_id', String(permissions[0].id));
    }
  }, [permissions, form, editingUser]);

  // Client-side filtering
  const filteredUsers = useMemo(() => {
    if (!search.trim()) return users;
    
    const searchLower = search.toLowerCase();
    return users.filter(user => 
      user.name.toLowerCase().includes(searchLower) ||
      user.email.toLowerCase().includes(searchLower)
    );
  }, [users, search]);

  const handleOpenModal = (user?: UserRecord) => {
    if (user) {
      // console.log(user);
      
      setEditingUser(user);
      form.reset({
        tipo_pessoa: user.tipo_pessoa,
        permission_id: String(user.permission_id),
        email: user.email,
        name: user.name,
        cpf: user.cpf || '',
        cnpj: user.cnpj || '',
        // status: user.status,
        razao: user.razao || '',
        genero: user.genero,
        ativo: user.ativo,
        config: typeof user.config === 'object' && !Array.isArray(user.config)
        ? user.config
        : {
          nome_fantasia: user.config.nome_fantasia ?? '',
          celular: user.config.celular ?? '',
          telefone_residencial: user.config.telefone_residencial ?? '',
          telefone_comercial: user.config.telefone_comercial ?? '',
          rg: user.config.rg ?? '',
          nascimento: user.config.nascimento ?? '',
          escolaridade: user.config.escolaridade ?? '',
          profissao: user.config.profissao ?? '',
          tipo_pj: user.config.tipo_pj ?? '',
          cep: user.config.cep ?? '',
          endereco: user.config.endereco ?? '',
          numero: user.config.numero ?? '',
          complemento: user.config.complemento ?? '',
          bairro: user.config.bairro ?? '',
          cidade: user.config.cidade ?? '',
          uf: user.config.uf ?? '',
        },
      });
    } else {
      setEditingUser(null);
      form.reset({
        permission_id: permissions.length > 0 ? String(permissions[0].id) : "",
      });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingUser(null);
    form.reset();
  };

  const onSubmit = async (data: UserFormData) => {
    console.log('Valores submetidos:', data); 
    try {
      const payload: CreateUserInput = {
        tipo_pessoa: data.tipo_pessoa,
        token: '', // Empty token as per schema
        permission_id: data.permission_id,
        email: data.email,
        password: data.password || 'mudar123', // Default password if not provided
        name: data.name,
        cpf: data.cpf || '',
        cnpj: data.cnpj || '',
        razao: data.razao || '',
        config: {
          nome_fantasia: data.config?.nome_fantasia || '',
          celular: data.config?.celular || '',
          telefone_residencial: data.config?.telefone_residencial || '',
          telefone_comercial: data.config?.telefone_comercial || '',
          rg: data.config?.rg || '',
          nascimento: data.config?.nascimento || '',
          escolaridade: data.config?.escolaridade || '',
          profissao: data.config?.profissao || '',
          tipo_pj: data.config?.tipo_pj || '',
          cep: data.config?.cep || '',
          endereco: data.config?.endereco || '',
          numero: data.config?.numero || '',
          complemento: data.config?.complemento || '',
          bairro: data.config?.bairro || '',
          cidade: data.config?.cidade || '',
          uf: data.config?.uf || '',
        },
        genero: data.genero,
        ativo: data.ativo,
      };

      if (editingUser) {
        await updateMutation.mutateAsync({ 
          id: editingUser.id, 
          data: payload
        });
      } else {
        await createMutation.mutateAsync(payload);
      }
      handleCloseModal();
    } catch (error) {
      // Error is handled by the mutation hooks
    }
  };

  const handleDelete = async () => {
    if (deletingUser) {
      try {
        await deleteMutation.mutateAsync(deletingUser.id);
        setDeletingUser(null);
      } catch (error) {
        // Error is handled by the mutation hook
      }
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'actived':
        return <Badge className="bg-success text-success-foreground">Ativo</Badge>;
      case 'disabled':
        return <Badge variant="secondary">Desabilitado</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getAtivoBadge = (ativo: string) => {
    return ativo === 's' ? 
      <Badge className="bg-success text-success-foreground">Sim</Badge> : 
      <Badge variant="secondary">Não</Badge>;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error) {
    const errorMessage = (error as Error).message;
    if (errorMessage.includes('403') || errorMessage.includes('Forbidden')) {
      return (
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center p-6 max-w-md">
            <h2 className="text-2xl font-semibold text-destructive mb-2">Acesso Negado</h2>
            <p className="text-muted-foreground">
              Você não tem permissão para acessar a gestão de usuários.
            </p>
          </div>
        </div>
      );
    }
    
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center p-6 max-w-md">
          <h2 className="text-2xl font-semibold text-destructive mb-2">Erro</h2>
          <p className="text-muted-foreground">
            Erro ao carregar usuários: {errorMessage}
          </p>
          <Button onClick={() => window.location.reload()} className="mt-4">
            Tentar Novamente
          </Button>
        </div>
      </div>
    );
  }
  const handleOnclick = ()=>{
    const rowData = form.getValues();
    console.log('Dados do Formulario',rowData);
    
  }
  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Usuários</h1>
          <p className="text-muted-foreground">
            Gerencie os usuários do sistema
          </p>
        </div>
        {/* Navega para a página dedicada de criação de usuário */}
        <Button onClick={() => navigate('/admin/settings/users/create')}>
          <Plus className="mr-2 h-4 w-4" />
          Novo Usuário
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Lista de Usuários</CardTitle>
          <CardDescription>
            Configure os usuários do sistema
          </CardDescription>
          <div className="flex items-center space-x-2">
            <div className="flex items-center space-x-2 mr-4">
              <Switch
                checked={showTrash}
                onCheckedChange={setShowTrash}
                aria-label="Mostrar registros na lixeira"
              />
              <span className="text-sm text-muted-foreground w-max">
                {showTrash ? 'Ocultar Lixeira' : 'Mostrar Lixeira'}
              </span>
            </div>
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Buscar usuários..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredUsers.length === 0 ? (
            <div className="text-center py-6">
              {search.trim() ? (
                <p className="text-muted-foreground">
                  Nenhum usuário encontrado para "{search}".
                </p>
              ) : (
                <>
                  <p className="text-muted-foreground">Nenhum usuário encontrado{showTrash ? ' na lixeira' : ''}.</p>
                  {!showTrash && (
                    <Button 
                      onClick={() => handleOpenModal()} 
                      className="mt-4"
                      variant="outline"
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Criar primeiro usuário
                    </Button>
                  )}
                </>
              )}
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Permissão</TableHead>
                    {/* <TableHead>Status</TableHead> */}
                    <TableHead>Ativo</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">
                        {user.name}
                      </TableCell>
                      <TableCell>
                        {user.email}
                      </TableCell>
                      <TableCell>
                        {permissions.find(p => String(p.id) === String(user.permission_id))?.name || user.permission_id}
                      </TableCell>
                      {/* <TableCell>
                        {getStatusBadge(user.status)}
                      </TableCell> */}
                      <TableCell>
                        {getAtivoBadge(user.ativo)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end space-x-2">
                        {showTrash ? (
                            <>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => restoreMutation.mutate(user.id)}
                                title="Restaurar"
                              >
                                <RotateCcw className="h-4 w-4 text-green-600" />
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setDeletingUser(user)}
                                title="Excluir Permanentemente"
                              >
                                <Trash2 className="h-4 w-4 text-red-600" />
                              </Button>
                            </>
                          ) : (
                            <>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleOpenModal(user)}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setDeletingUser(user)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <p className="text-sm text-muted-foreground">
                    Página {page} de {totalPages}
                  </p>
                  <div className="flex space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(Math.max(1, page - 1))}
                      disabled={page === 1}
                    >
                      Anterior
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(Math.min(totalPages, page + 1))}
                      disabled={page === totalPages}
                    >
                      Próxima
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
      
      {/* Create/Edit Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingUser ? 'Editar Usuário' : 'Novo Usuário'}
            </DialogTitle>
            <DialogDescription>
              {editingUser ? 'Altere os dados do usuário' : 'Preencha os dados para criar um novo usuário'}
            </DialogDescription>
          </DialogHeader>
          <UserForm
            form={form}
            onSubmit={onSubmit}
            onCancel={handleCloseModal}
            editingUser={editingUser ?? null}
            permissions={permissions}
            isLoadingPermissions={isLoadingPermissions}
            handleOnclick={handleOnclick}
            showTipoPessoa={false}
            showGenero={false}
            showAddressSection={false}
            showCpf={false}
            showPhones={false}
            ativoAsSwitch={true}
            showBirthDate={false}
          />
          </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deletingUser} onOpenChange={() => setDeletingUser(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {showTrash ? 'Excluir Permanentemente' : 'Confirmar exclusão'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {showTrash ? (
                <>
                  Tem certeza de que deseja excluir permanentemente o usuário "{deletingUser?.name}"?
                  <br />
                  <span className="font-bold text-destructive">Esta ação NÃO pode ser desfeita.</span>
                </>
              ) : (
                `Tem certeza de que deseja mover o usuário "${deletingUser?.name}" para a lixeira?`
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => {
                if (deletingUser) {
                  if (showTrash) {
                    forceDeleteMutation.mutate(deletingUser.id);
                  } else {
                    deleteMutation.mutate(deletingUser.id);
                  }
                  setDeletingUser(null);
                }
              }} 
              disabled={deleteMutation.isPending || forceDeleteMutation.isPending}
              className={showTrash ? "bg-destructive hover:bg-destructive/90" : ""}
            >
              {showTrash ? 'Excluir Permanentemente' : 'Excluir'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}