import { useState, useEffect, useMemo } from 'react';
import { Plus, Search, Pencil, Trash2, Check, X } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
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
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';

import { 
  usePermissionsList, 
  useCreatePermission, 
  useUpdatePermission,
  useDeletePermission,
  useMenuPermissions,
  useUpdateMenuPermissions
} from '@/hooks/permissions';
import { PermissionRecord, CreatePermissionInput, MenuPermissionRow, AccessFlagKey } from '@/types/permissions';
import { buildPermissionTree, createInitialAccessFlags } from '@/lib/menuPermissions';
import { useAuth } from '@/contexts/AuthContext';

const permissionSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  description: z.string().optional(),
});

type PermissionFormData = z.infer<typeof permissionSchema>;

export default function Permissions() {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPermission, setEditingPermission] = useState<PermissionRecord | null>(null);
  const [deletingPermission, setDeletingPermission] = useState<PermissionRecord | null>(null);
  const [selectedPermissionId, setSelectedPermissionId] = useState<string>('');
  const [accessFlags, setAccessFlags] = useState<Record<string, any>>({});

  const { menu: apiMenu } = useAuth();
  
  // Get menu from auth context (which loads from localStorage)
  const menuItems = apiMenu || [];

  const { data: permissionsData, isLoading, error } = usePermissionsList({ 
    page, 
    per_page: 10 
  });

  const { data: menuPermissions } = useMenuPermissions(selectedPermissionId);
  const updateMenuPermissionsMutation = useUpdateMenuPermissions();

  const createMutation = useCreatePermission();
  const updateMutation = useUpdatePermission();
  const deleteMutation = useDeletePermission();

  const form = useForm<PermissionFormData>({
    resolver: zodResolver(permissionSchema),
    defaultValues: {
      name: '',
      description: '',
    },
  });

  const permissions = permissionsData?.data || [];
  const totalPages = permissionsData?.last_page || 1;

  // Client-side filtering
  const filteredPermissions = useMemo(() => {
    if (!search.trim()) return permissions;
    
    const searchLower = search.toLowerCase();
    return permissions.filter(permission => 
      permission.name.toLowerCase().includes(searchLower) ||
      (permission.description && permission.description.toLowerCase().includes(searchLower))
    );
  }, [permissions, search]);
  const permissionTree = buildPermissionTree(menuItems);
  
  // Create lookup maps for efficient access
  const nodesByKey = useMemo(
    () => Object.fromEntries(permissionTree.map(n => [n.key, n])),
    [permissionTree]
  );
  
  const keyByMenuId = useMemo(
    () => {
      const map: Record<string, string> = {};
      permissionTree.forEach(n => { map[String(n.id)] = n.key; });
      return map;
    },
    [permissionTree]
  );

  // Create parent-child relationship maps
  const childrenByParentKey = useMemo(() => {
    const map: Record<string, string[]> = {};
    permissionTree.forEach(node => {
      if (node.parent) {
        if (!map[node.parent]) map[node.parent] = [];
        map[node.parent].push(node.key);
      }
    });
    return map;
  }, [permissionTree]);

  // Get all leaf node keys (nodes without children)
  const leafKeys = useMemo(() => {
    const hasChildren = new Set(Object.keys(childrenByParentKey));
    return permissionTree.filter(node => !hasChildren.has(node.key)).map(node => node.key);
  }, [permissionTree, childrenByParentKey]);

  // Helper function to get all descendants of a node
  const getDescendants = (nodeKey: string): string[] => {
    const children = childrenByParentKey[nodeKey] || [];
    const allDescendants = [...children];
    children.forEach(child => {
      allDescendants.push(...getDescendants(child));
    });
    return allDescendants;
  };

  // Initialize and hydrate accessFlags
  useEffect(() => {
    if (menuItems.length === 0) return;
    
    // Start with initial flags (all false)
    const newAccessFlags = { ...createInitialAccessFlags(menuItems) };
    
    // Hydrate with actual permissions if available
    if (menuPermissions && menuPermissions.length > 0) {
      menuPermissions.forEach((menuPerm: MenuPermissionRow) => {
        // Find the key by menu_id
        const key = keyByMenuId[String(menuPerm.menu_id)];
        if (key && newAccessFlags[key]) {
          newAccessFlags[key] = {
            can_view: !!menuPerm.can_view,
            can_create: !!menuPerm.can_create,
            can_edit: !!menuPerm.can_edit,
            can_delete: !!menuPerm.can_delete,
            can_upload: !!menuPerm.can_upload,
          };
        }
      });
    }
    
    setAccessFlags(newAccessFlags);
  }, [menuItems, menuPermissions]); // Removed keyByMenuId to prevent infinite loop

  const handleOpenModal = (permission?: PermissionRecord) => {
    if (permission) {
      setEditingPermission(permission);
      form.reset({
        name: permission.name,
        description: permission.description || '',
      });
    } else {
      setEditingPermission(null);
      form.reset({
        name: '',
        description: '',
      });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingPermission(null);
    form.reset();
  };

  const onSubmit = async (data: PermissionFormData) => {
    try {
      if (editingPermission) {
        await updateMutation.mutateAsync({ 
          id: editingPermission.id, 
          data: data as CreatePermissionInput 
        });
      } else {
        await createMutation.mutateAsync(data as CreatePermissionInput);
      }
      handleCloseModal();
    } catch (error) {
      // Error is handled by the mutation hooks
    }
  };

  const handleDelete = async () => {
    if (deletingPermission) {
      try {
        await deleteMutation.mutateAsync(deletingPermission.id);
        setDeletingPermission(null);
      } catch (error) {
        // Error is handled by the mutation hook
      }
    }
  };

  // Get aggregated state for parent nodes (true if all children true, false if all false, indeterminate if mixed)
  const getAggregatedState = (nodeKey: string, flag: AccessFlagKey): { checked: boolean; indeterminate?: boolean } => {
    const node = nodesByKey[nodeKey];
    if (!node || !childrenByParentKey[nodeKey]) {
      // Leaf node - return actual state
      return { checked: !!accessFlags[nodeKey]?.[flag] };
    }
    
    // Parent node - check all descendants
    const descendants = getDescendants(nodeKey);
    if (descendants.length === 0) {
      return { checked: !!accessFlags[nodeKey]?.[flag] };
    }
    
    const checkedDescendants = descendants.filter(desc => !!accessFlags[desc]?.[flag]);
    
    if (checkedDescendants.length === 0) {
      return { checked: false };
    } else if (checkedDescendants.length === descendants.length) {
      return { checked: true };
    } else {
      return { checked: false, indeterminate: true };
    }
  };

  // Set flag value cascading to all descendants
  const setFlagCascade = (nodeKey: string, flag: AccessFlagKey, value: boolean) => {
    setAccessFlags(prev => {
      const newFlags = { ...prev };
      
      // Set the value for this node
      if (!newFlags[nodeKey]) newFlags[nodeKey] = {};
      newFlags[nodeKey][flag] = value;
      
      // If this node has children, propagate to all descendants
      const descendants = getDescendants(nodeKey);
      descendants.forEach(desc => {
        if (!newFlags[desc]) newFlags[desc] = {};
        newFlags[desc][flag] = value;
      });
      
      return newFlags;
    });
  };

  const handleAccessFlagChange = (key: string, flag: AccessFlagKey, value: boolean) => {
    const node = nodesByKey[key];
    if (node && childrenByParentKey[key]) {
      // Parent node - cascade to children
      setFlagCascade(key, flag, value);
    } else {
      // Leaf node - set individual value
      setAccessFlags(prev => ({
        ...prev,
        [key]: {
          ...((prev || {})[key] || {}),
          [flag]: value,
        }
      }));
    }
  };

  const handleSelectAllForFlag = (flag: AccessFlagKey, value: boolean) => {
    const newAccessFlags = { ...accessFlags };
    // Only apply to leaf nodes (nodes without children)
    leafKeys.forEach(key => {
      if (!newAccessFlags[key]) newAccessFlags[key] = {};
      newAccessFlags[key][flag] = value;
    });
    setAccessFlags(newAccessFlags);
  };

  const handleSaveAccessPermissions = async () => {
    if (!selectedPermissionId) return;

    // Only save leaf nodes (nodes without children) as the API doesn't expect parent permissions
    const menuPermissionRows: MenuPermissionRow[] = leafKeys
      .filter(key => accessFlags[key]) // Only include keys that have flags set
      .map(key => {
        const node = nodesByKey[key];
        const flags = accessFlags[key];
        return {
          permission_id: selectedPermissionId,
          menu_id: node?.id ?? key,
          parent_id: node?.parent_id ?? null,
          can_view: flags.can_view,
          can_create: flags.can_create,
          can_edit: flags.can_edit,
          can_delete: flags.can_delete,
          can_upload: flags.can_upload,
        };
      });

    await updateMenuPermissionsMutation.mutateAsync({
      permission_id: selectedPermissionId,
      permissions: menuPermissionRows,
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error) {
    const isLaravelTenancyError = (error as Error).message.includes('erro404_site') || 
                                 (error as Error).message.includes('View') || 
                                 (error as Error).message.includes('not found');
    
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center p-6 max-w-md">
          <h2 className="text-2xl font-semibold text-destructive mb-2">Erro de Configuração</h2>
          {isLaravelTenancyError ? (
            <div className="space-y-3">
              <p className="text-muted-foreground">
                Erro de tenancy do Laravel. Configure a variável de ambiente:
              </p>
              <div className="bg-muted p-3 rounded font-mono text-sm">
                VITE_TENANT_API_URL=https://maisaqui1.ctloja.com.br/api/v1
              </div>
              <p className="text-xs text-muted-foreground">
                Remova o prefixo "api-" do domínio para acessar o tenant correto.
              </p>
            </div>
          ) : (
            <p className="text-muted-foreground">
              Erro ao carregar permissões: {(error as Error).message}
            </p>
          )}
          <Button onClick={() => window.location.reload()} className="mt-4">
            Tentar Novamente
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Permissões</h1>
          <p className="text-muted-foreground">
            Gerencie as permissões do sistema
          </p>
        </div>
        <Button onClick={() => handleOpenModal()}>
          <Plus className="mr-2 h-4 w-4" />
          Nova Permissão
        </Button>
      </div>

      <Tabs defaultValue="dados" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="dados">Dados</TabsTrigger>
          <TabsTrigger value="acessos">Acessos</TabsTrigger>
        </TabsList>

        <TabsContent value="dados" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Lista de Permissões</CardTitle>
              <CardDescription>
                Configure as permissões disponíveis no sistema
              </CardDescription>
              <div className="flex items-center space-x-2">
                <div className="relative flex-1 max-w-sm">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                  <Input
                    placeholder="Buscar permissões..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {filteredPermissions.length === 0 ? (
                <div className="text-center py-6">
                  {search.trim() ? (
                    <>
                      <p className="text-muted-foreground">
                        Nenhuma permissão encontrada para "{search}".
                      </p>
                    </>
                  ) : (
                    <>
                      <p className="text-muted-foreground">Nenhuma permissão encontrada.</p>
                      <Button 
                        onClick={() => handleOpenModal()} 
                        className="mt-4"
                        variant="outline"
                      >
                        <Plus className="mr-2 h-4 w-4" />
                        Criar primeira permissão
                      </Button>
                    </>
                  )}
                </div>
              ) : (
                <>
                  <Table>
                    <TableHeader>
                       <TableRow>
                         <TableHead>Nome</TableHead>
                         <TableHead>Descrição</TableHead>
                         <TableHead className="text-right">Ações</TableHead>
                       </TableRow>
                    </TableHeader>
                     <TableBody>
                       {filteredPermissions.map((permission) => (
                        <TableRow key={permission.id}>
                           <TableCell className="font-medium">
                             {permission.name}
                           </TableCell>
                           <TableCell className="max-w-xs">
                             <span className="truncate">
                               {permission.description || '-'}
                             </span>
                           </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end space-x-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleOpenModal(permission)}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setDeletingPermission(permission)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
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
        </TabsContent>

        <TabsContent value="acessos" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Permissões de Acesso</CardTitle>
              <CardDescription>
                Configure as permissões de acesso aos módulos do sistema
              </CardDescription>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <label htmlFor="permission-select" className="text-sm font-medium">
                    Selecionar Permissão:
                  </label>
                  <select
                    id="permission-select"
                    value={selectedPermissionId}
                    onChange={(e) => setSelectedPermissionId(e.target.value)}
                    className="px-3 py-2 border rounded-md bg-background"
                  >
                    <option value="">Escolha uma permissão...</option>
                    {permissions.map(permission => (
                      <option key={permission.id} value={permission.id}>
                        {permission.name}
                      </option>
                    ))}
                  </select>
                </div>
                {selectedPermissionId && (
                  <Button 
                    onClick={handleSaveAccessPermissions}
                    disabled={updateMenuPermissionsMutation.isPending}
                  >
                    Salvar Permissões
                  </Button>
                )}
              </div>
            </CardHeader>
            
            {selectedPermissionId ? (
              <CardContent>
                <div className="space-y-4">
                  {/* Header with "Marcar todos" checkboxes */}
                  <div className="flex items-center space-x-4 p-3 bg-muted rounded-md">
                    <div className="flex-1 font-medium">Módulo / Funcionalidade</div>
                    <div className="flex space-x-8">
                      <div className="flex flex-col items-center space-y-1">
                        <span className="text-xs font-medium">Visualizar</span>
                        <Checkbox 
                          checked={leafKeys.every(key => !!accessFlags[key]?.can_view)}
                          onCheckedChange={(checked) => handleSelectAllForFlag('can_view', !!checked)}
                        />
                      </div>
                      <div className="flex flex-col items-center space-y-1">
                        <span className="text-xs font-medium">Criar</span>
                        <Checkbox 
                          checked={leafKeys.every(key => !!accessFlags[key]?.can_create)}
                          onCheckedChange={(checked) => handleSelectAllForFlag('can_create', !!checked)}
                        />
                      </div>
                      <div className="flex flex-col items-center space-y-1">
                        <span className="text-xs font-medium">Editar</span>
                        <Checkbox 
                          checked={leafKeys.every(key => !!accessFlags[key]?.can_edit)}
                          onCheckedChange={(checked) => handleSelectAllForFlag('can_edit', !!checked)}
                        />
                      </div>
                      <div className="flex flex-col items-center space-y-1">
                        <span className="text-xs font-medium">Excluir</span>
                        <Checkbox 
                          checked={leafKeys.every(key => !!accessFlags[key]?.can_delete)}
                          onCheckedChange={(checked) => handleSelectAllForFlag('can_delete', !!checked)}
                        />
                      </div>
                      <div className="flex flex-col items-center space-y-1">
                        <span className="text-xs font-medium">Upload</span>
                        <Checkbox 
                          checked={leafKeys.every(key => !!accessFlags[key]?.can_upload)}
                          onCheckedChange={(checked) => handleSelectAllForFlag('can_upload', !!checked)}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Permission tree rows */}
                  {permissionTree.map((node) => (
                    <div 
                      key={node.key}
                      className={`flex items-center space-x-4 p-3 border rounded-md ${
                        node.level > 0 ? 'ml-6 border-l-4 border-l-muted' : ''
                      }`}
                    >
                      <div className="flex-1">
                        <span 
                          className={`${
                            node.level === 0 ? 'font-semibold' : 'text-muted-foreground'
                          }`}
                          style={{ marginLeft: `${node.level * 20}px` }}
                        >
                          {node.title}
                        </span>
                      </div>
                      <div className="flex space-x-8">
                         {(() => {
                           const viewState = getAggregatedState(node.key, 'can_view');
                           return (
                             <Checkbox 
                               checked={viewState.checked}
                               onCheckedChange={(checked) => handleAccessFlagChange(node.key, 'can_view', !!checked)}
                             />
                           );
                         })()}
                         {(() => {
                           const createState = getAggregatedState(node.key, 'can_create');
                           return (
                             <Checkbox 
                               checked={createState.checked}
                               onCheckedChange={(checked) => handleAccessFlagChange(node.key, 'can_create', !!checked)}
                             />
                           );
                         })()}
                         {(() => {
                           const editState = getAggregatedState(node.key, 'can_edit');
                           return (
                             <Checkbox 
                               checked={editState.checked}
                               onCheckedChange={(checked) => handleAccessFlagChange(node.key, 'can_edit', !!checked)}
                             />
                           );
                         })()}
                         {(() => {
                           const deleteState = getAggregatedState(node.key, 'can_delete');
                           return (
                             <Checkbox 
                               checked={deleteState.checked}
                               onCheckedChange={(checked) => handleAccessFlagChange(node.key, 'can_delete', !!checked)}
                             />
                           );
                         })()}
                         {(() => {
                           const uploadState = getAggregatedState(node.key, 'can_upload');
                           return (
                             <Checkbox 
                               checked={uploadState.checked}
                               onCheckedChange={(checked) => handleAccessFlagChange(node.key, 'can_upload', !!checked)}
                             />
                           );
                         })()}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            ) : (
              <CardContent>
                <div className="text-center py-8 text-muted-foreground">
                  Selecione uma permissão para configurar os acessos
                </div>
              </CardContent>
            )}
          </Card>
        </TabsContent>
      </Tabs>

      {/* Create/Edit Modal */}
      <Dialog open={isModalOpen} onOpenChange={handleCloseModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingPermission ? 'Editar Permissão' : 'Nova Permissão'}
            </DialogTitle>
            <DialogDescription>
              {editingPermission 
                ? 'Atualize as informações da permissão.' 
                : 'Crie uma nova permissão no sistema.'}
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: Visualizar Relatórios" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Descrição (Opcional)</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Descreva o que esta permissão permite..."
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={handleCloseModal}>
                  Cancelar
                </Button>
                <Button 
                  type="submit"
                  disabled={createMutation.isPending || updateMutation.isPending}
                >
                  {editingPermission ? 'Salvar' : 'Criar'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog 
        open={!!deletingPermission} 
        onOpenChange={() => setDeletingPermission(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir a permissão "{deletingPermission?.name}"?
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDelete}
              disabled={deleteMutation.isPending}
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}