import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Plus, 
  Search, 
  Pencil, 
  Trash2, 
  RotateCcw, 
  Users as UsersIcon,
  Trash as TrashIcon,
  Filter,
  MoreVertical,
  ChevronLeft,
  ChevronRight,
  Shield,
  Mail,
  CheckCircle2,
  XCircle
} from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

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
  razao: z.string().optional(),
  genero: z.enum(["m", "f", "ni"]).optional(),
  ativo: z.enum(["s", "n"]).optional(),
  force_password_change: z.enum(["s", "n"]).optional(),
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
    force_password_change: z.enum(["s", "n"]).nullable().optional(),
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

  useEffect(() => {
    setPage(1);
  }, [showTrash]);

  const { data: usersData, isLoading, error } = useUsersList({ 
    page, 
    per_page: 10,
    excluido: showTrash ? 's' : undefined
  });

  const { data: permissionsData, isLoading: isLoadingPermissions } = usePermissionsList({ per_page: 100 });
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

  useEffect(() => {
    const currentPermissionId = form.getValues('permission_id');
    if (!currentPermissionId && permissions.length > 0 && !editingUser) {
      form.setValue('permission_id', String(permissions[0].id));
    }
  }, [permissions, form, editingUser]);

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
      setEditingUser(user);
      form.reset({
        tipo_pessoa: user.tipo_pessoa,
        permission_id: String(user.permission_id),
        email: user.email,
        name: user.name,
        cpf: user.cpf || '',
        cnpj: user.cnpj || '',
        razao: user.razao || '',
        genero: user.genero,
        ativo: user.ativo,
        force_password_change: user.force_password_change ? 's' : (user.config?.force_password_change === 's' ? 's' : 'n'),
        config: typeof user.config === 'object' && !Array.isArray(user.config)
        ? user.config
        : {
          nome_fantasia: user.config?.nome_fantasia ?? '',
          celular: user.config?.celular ?? '',
          telefone_residencial: user.config?.telefone_residencial ?? '',
          telefone_comercial: user.config?.telefone_comercial ?? '',
          rg: user.config?.rg ?? '',
          nascimento: user.config?.nascimento ?? '',
          escolaridade: user.config?.escolaridade ?? '',
          profissao: user.config?.profissao ?? '',
          tipo_pj: user.config?.tipo_pj ?? '',
          cep: user.config?.cep ?? '',
          endereco: user.config?.endereco ?? '',
          numero: user.config?.numero ?? '',
          complemento: user.config?.complemento ?? '',
          bairro: user.config?.bairro ?? '',
          cidade: user.config?.cidade ?? '',
          uf: user.config?.uf ?? '',
          force_password_change: user.config?.force_password_change ?? 'n',
        },
      });
    } else {
      setEditingUser(null);
      form.reset({
        tipo_pessoa: 'pf',
        permission_id: permissions.length > 0 ? String(permissions[0].id) : "",
        email: '',
        name: '',
        password: '',
        genero: 'ni',
        ativo: 's',
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
    try {
      const payload: CreateUserInput = {
        tipo_pessoa: data.tipo_pessoa || 'pf',
        token: '',
        permission_id: data.permission_id,
        email: data.email,
        password: data.password || (editingUser ? '' : 'mudar123'),
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
        genero: data.genero || 'ni',
        ativo: data.ativo || 's',
        force_password_change: data.force_password_change || 'n',
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
      // Handled by mutations
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  };

  if (isLoading) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          <p className="text-muted-foreground animate-pulse">Carregando usuários...</p>
        </div>
      </div>
    );
  }

  if (error) {
    const isForbidden = (error as any).status === 403;
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <Card className="max-w-md w-full border-destructive/20 bg-destructive/5">
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
              <XCircle className="h-6 w-6 text-destructive" />
            </div>
            <CardTitle className="text-destructive">
              {isForbidden ? "Acesso Negado" : "Erro ao Carregar"}
            </CardTitle>
            <CardDescription>
              {isForbidden 
                ? "Você não tem as permissões necessárias para visualizar os usuários." 
                : (error as Error).message}
            </CardDescription>
          </CardHeader>
          {!isForbidden && (
            <CardContent className="flex justify-center">
              <Button onClick={() => window.location.reload()}>Tentar Novamente</Button>
            </CardContent>
          )}
        </Card>
      </div>
    );
  }

  return (
    <div className="container-fluid py-8 px-4 md:px-8 space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-1">
          <div className="flex items-center gap-2 mb-1">
            <div className="p-2 bg-primary/10 rounded-lg text-primary">
              <UsersIcon className="h-6 w-6" />
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">Usuários</h1>
          </div>
          <p className="text-muted-foreground">
            Gerencie o acesso e permissões das pessoas que utilizam a plataforma.
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="flex items-center bg-zinc-100 dark:bg-zinc-800 p-1 rounded-lg">
            <Button 
              variant={!showTrash ? "secondary" : "ghost"} 
              size="sm" 
              onClick={() => setShowTrash(false)}
              className={cn("gap-2", !showTrash && "bg-white dark:bg-zinc-700 shadow-sm")}
            >
              <UsersIcon className="h-4 w-4" />
              <span>Ativos</span>
            </Button>
            <Button 
              variant={showTrash ? "secondary" : "ghost"} 
              size="sm" 
              onClick={() => setShowTrash(true)}
              className={cn("gap-2", showTrash && "bg-white dark:bg-zinc-700 shadow-sm")}
            >
              <TrashIcon className="h-4 w-4" />
              <span>Lixeira</span>
            </Button>
          </div>
          <Button 
            onClick={() => navigate('/admin/settings/users/create')}
            className="bg-primary hover:bg-primary/90 shadow-md gap-2"
          >
            <Plus className="h-4 w-4" />
            <span>Novo Usuário</span>
          </Button>
        </div>
      </div>

      <Card className="border-none shadow-xl bg-white/50 backdrop-blur-sm dark:bg-zinc-900/50">
        <CardHeader className="pb-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Buscar por nome ou e-mail..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10 h-10 bg-zinc-50 dark:bg-zinc-800/50 border-zinc-200 dark:border-zinc-700"
              />
            </div>
            <Button variant="outline" size="icon" className="md:hidden">
              <Filter className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-zinc-50 dark:bg-zinc-800/50">
                <TableRow className="hover:bg-transparent">
                  <TableHead className="w-[300px] pl-6 py-4">Usuário</TableHead>
                  <TableHead className="py-4">Nível / Permissão</TableHead>
                  <TableHead className="py-4 text-center">Status</TableHead>
                  <TableHead className="pr-6 text-right py-4">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="h-64 text-center">
                      <div className="flex flex-col items-center justify-center text-muted-foreground gap-2">
                        <UsersIcon className="h-12 w-12 opacity-20" />
                        <p className="text-lg font-medium">Nenhum usuário encontrado</p>
                        {search && <p className="text-sm">Tente mudar os termos da busca.</p>}
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredUsers.map((user) => (
                    <TableRow key={user.id} className="group hover:bg-zinc-50/50 dark:hover:bg-zinc-800/30 transition-colors">
                      <TableCell className="pl-6 py-4">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-10 w-10 border-2 border-white dark:border-zinc-800 shadow-sm">
                            <AvatarImage src={`https://avatar.vercel.sh/${user.email}.png`} />
                            <AvatarFallback className="bg-primary/5 text-primary text-xs font-bold">
                              {getInitials(user.name)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex flex-col">
                            <span className="font-semibold text-zinc-900 dark:text-zinc-100 group-hover:text-primary transition-colors">
                              {user.name}
                            </span>
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              <Mail className="h-3 w-3" />
                              {user.email}
                            </span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="py-4">
                        <Badge variant="outline" className="bg-zinc-50 dark:bg-zinc-800/50 border-zinc-200 dark:border-zinc-700 font-medium py-0.5 px-2 flex items-center gap-1.5 w-fit">
                          <Shield className="h-3.5 w-3.5 text-zinc-500" />
                          {permissions.find(p => String(p.id) === String(user.permission_id))?.name || `Nível ${user.permission_id}`}
                        </Badge>
                      </TableCell>
                      <TableCell className="py-4 text-center">
                        <div className="flex justify-center">
                          {user.ativo === 's' ? (
                            <Badge className="bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20 hover:bg-emerald-50 gap-1 px-2.5 py-0.5">
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              Ativo
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border-transparent gap-1 px-2.5 py-0.5">
                              <XCircle className="h-3.5 w-3.5" />
                              Inativo
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right pr-6 py-4">
                        <div className="flex justify-end items-center gap-1 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity">
                          {showTrash ? (
                            <>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                                onClick={() => restoreMutation.mutate(user.id)}
                                title="Restaurar"
                              >
                                <RotateCcw className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                                onClick={() => setDeletingUser(user)}
                                title="Excluir Permanentemente"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </>
                          ) : (
                            <>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-zinc-500 hover:text-primary hover:bg-zinc-100 dark:hover:bg-zinc-800"
                                onClick={() => handleOpenModal(user)}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-500">
                                    <MoreVertical className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-48">
                                  <DropdownMenuLabel>Opções</DropdownMenuLabel>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem onClick={() => handleOpenModal(user)} className="gap-2 cursor-pointer">
                                    <Pencil className="h-4 w-4" /> Editar usuário
                                  </DropdownMenuItem>
                                  <DropdownMenuItem 
                                    onClick={() => setDeletingUser(user)} 
                                    className="gap-2 text-destructive focus:text-destructive cursor-pointer"
                                  >
                                    <Trash2 className="h-4 w-4" /> Excluir acesso
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {totalPages > 1 && (
            <div className="px-6 py-4 flex items-center justify-between border-t border-zinc-100 dark:border-zinc-800 bg-zinc-50/30">
              <span className="text-sm text-muted-foreground font-medium">
                Página <span className="text-zinc-900 dark:text-zinc-100">{page}</span> de {totalPages}
              </span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(Math.max(1, page - 1))}
                  disabled={page === 1}
                  className="h-8 gap-1 pr-3"
                >
                  <ChevronLeft className="h-4 w-4" /> Anterior
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(Math.min(totalPages, page + 1))}
                  disabled={page === totalPages}
                  className="h-8 gap-1 pl-3"
                >
                  Próxima <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Create/Edit Modal - Enhanced with modern styling matching the table */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col p-0 border-none shadow-2xl">
          <div className="bg-zinc-900 p-8 text-white relative">
            <div className="absolute right-0 bottom-0 opacity-10">
              <UsersIcon className="h-32 w-32 translate-x-12 translate-y-12" />
            </div>
            <DialogHeader className="space-y-1">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-white/10 rounded-lg">
                  <Plus className="h-5 w-5 text-white" />
                </div>
                <DialogTitle className="text-2xl font-bold tracking-tight">
                  {editingUser ? 'Atualizar Usuário' : 'Novo Cadastro'}
                </DialogTitle>
              </div>
              <DialogDescription className="text-zinc-400 text-base">
                {editingUser 
                  ? `Editando as informações de ${editingUser.name}` 
                  : 'Preencha os campos abaixo para criar um novo acesso ao sistema.'}
              </DialogDescription>
            </DialogHeader>
          </div>
          
          <div className="p-8 overflow-y-auto bg-white dark:bg-zinc-950 min-h-[500px]">
            <UserForm
              form={form}
              onSubmit={onSubmit}
              onCancel={handleCloseModal}
              editingUser={editingUser ?? null}
              permissions={permissions}
              isLoadingPermissions={isLoadingPermissions}
              showTipoPessoa={true}
              showGenero={true}
              showAddressSection={true}
              showCpf={true}
              showPhones={true}
              ativoAsSwitch={true}
              showBirthDate={true}
            />
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete/ForceDelete Dialog - Enhanced with modern look */}
      <AlertDialog open={!!deletingUser} onOpenChange={() => setDeletingUser(null)}>
        <AlertDialogContent className="max-w-md border-none shadow-2xl">
          <AlertDialogHeader>
            <div className="mx-auto w-14 h-14 rounded-full bg-red-50 dark:bg-red-950/30 flex items-center justify-center mb-4">
              <Trash2 className="h-7 w-7 text-red-600" />
            </div>
            <AlertDialogTitle className="text-xl font-bold text-center">
              {showTrash ? 'Exclusão Permanente' : 'Confirmar Remoção'}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-center text-base py-2">
              {showTrash ? (
                <>
                  Você está prestes a apagar definitivamente o usuário <span className="font-bold text-zinc-900 dark:text-zinc-100">{deletingUser?.name}</span>.
                  <br />
                  <span className="mt-2 block font-medium text-red-600 bg-red-50 dark:bg-red-900/10 p-2 rounded">
                    Esta ação é irreversível e todos os logs vinculados podem ser afetados.
                  </span>
                </>
              ) : (
                <>
                  Deseja mover <span className="font-bold text-zinc-900 dark:text-zinc-100">{deletingUser?.name}</span> para a lixeira?
                  <br />
                  O acesso será bloqueado imediatamente.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="sm:justify-center gap-3 mt-4">
            <AlertDialogCancel className="px-6 h-11 border-zinc-200">Não, manter</AlertDialogCancel>
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
              className={cn(
                "px-8 h-11 h hover:scale-[1.02] transition-transform",
                showTrash ? "bg-red-600 hover:bg-red-700" : "bg-zinc-900 hover:bg-zinc-800"
              )}
            >
              {showTrash ? 'Sim, excluir para sempre' : 'Sim, remover acesso'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}