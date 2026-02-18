import { useState, useMemo } from 'react';
import { 
  Plus, 
  Search, 
  Pencil, 
  Trash2, 
  RotateCcw, 
  Server as ServerIcon,
  Trash as TrashIcon,
  MoreVertical,
  CheckCircle2,
  XCircle,
  Key
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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
  DialogHeader,
  DialogTitle,
  DialogDescription,
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
import { cn } from '@/lib/utils';

import { 
  useApiCredentialsList, 
  useApiCredentialsTrash,
  useDeleteApiCredential,
  useRestoreApiCredential,
  useForceDeleteApiCredential,
  useUpdateApiCredential
} from '@/hooks/apiCredentials';
import { ApiCredential } from '@/types';
import { IntegrationForm } from '@/components/settings/IntegrationForm';
import { Switch } from '@/components/ui/switch';

export default function IntegrationsList() {
  const [search, setSearch] = useState('');
  const [showTrash, setShowTrash] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ApiCredential | null>(null);
  const [deletingItem, setDeletingItem] = useState<ApiCredential | null>(null);

  const { data: listData, isLoading: isLoadingList } = useApiCredentialsList({ 
    page: 1, 
    per_page: 100 // Load all for client-side search for now, or implement server search
  });
  
  const { data: trashData, isLoading: isLoadingTrash } = useApiCredentialsTrash({
      page: 1,
      per_page: 100
  });

  const deleteMutation = useDeleteApiCredential();
  const restoreMutation = useRestoreApiCredential();
  const forceDeleteMutation = useForceDeleteApiCredential();
  const updateMutation = useUpdateApiCredential();

  const data = showTrash ? trashData : listData;
  const items = data?.data || [];
  const isLoading = showTrash ? isLoadingTrash : isLoadingList;

  const filteredItems = useMemo(() => {
    if (!search.trim()) return items;
    const searchLower = search.toLowerCase();
    return items.filter(item => 
      item.name.toLowerCase().includes(searchLower) ||
      item.slug.toLowerCase().includes(searchLower)
    );
  }, [items, search]);

  const handleOpenModal = (item?: ApiCredential) => {
    setEditingItem(item || null);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingItem(null);
  };

  return (
    <div className="container-fluid py-8 px-4 md:px-8 space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-1">
          <div className="flex items-center gap-2 mb-1">
            <div className="p-2 bg-primary/10 rounded-lg text-primary">
              <ServerIcon className="h-6 w-6" />
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">Integrações</h1>
          </div>
          <p className="text-muted-foreground">
            Gerencie credenciais e configurações de APIs externas.
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
              <ServerIcon className="h-4 w-4" />
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
            onClick={() => handleOpenModal()}
            className="bg-primary hover:bg-primary/90 shadow-md gap-2"
          >
            <Plus className="h-4 w-4" />
            <span>Nova Integração</span>
          </Button>
        </div>
      </div>

      <Card className="border-none shadow-xl bg-white/50 backdrop-blur-sm dark:bg-zinc-900/50">
        <CardHeader className="pb-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Buscar por nome ou slug..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10 h-10 bg-zinc-50 dark:bg-zinc-800/50 border-zinc-200 dark:border-zinc-700"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-zinc-50 dark:bg-zinc-800/50">
                <TableRow className="hover:bg-transparent">
                  <TableHead className="w-[300px] pl-6 py-4">Nome</TableHead>
                  <TableHead className="py-4">Slug</TableHead>
                  <TableHead className="py-4">Configuração</TableHead>
                  <TableHead className="py-4 text-center">Status</TableHead>
                  <TableHead className="pr-6 text-right py-4">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                    <TableRow>
                        <TableCell colSpan={5} className="h-24 text-center">
                            <div className="flex justify-center items-center gap-2">
                                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                                <span>Carregando...</span>
                            </div>
                        </TableCell>
                    </TableRow>
                ) : filteredItems.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-64 text-center">
                      <div className="flex flex-col items-center justify-center text-muted-foreground gap-2">
                        <ServerIcon className="h-12 w-12 opacity-20" />
                        <p className="text-lg font-medium">Nenhuma integração encontrada</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredItems.map((item) => (
                    <TableRow key={item.id} className="group hover:bg-zinc-50/50 dark:hover:bg-zinc-800/30 transition-colors">
                      <TableCell className="pl-6 py-4 font-medium">
                        {item.name}
                      </TableCell>
                      <TableCell className="py-4">
                        <Badge variant="outline" className="font-mono text-xs">
                            {item.slug}
                        </Badge>
                      </TableCell>
                      <TableCell className="py-4">
                        <div className="flex flex-wrap gap-1">
                            {item.config && Object.keys(item.config).slice(0, 3).map(key => (
                                <Badge key={key} variant="secondary" className="text-[10px] h-5">
                                    {key}
                                </Badge>
                            ))}
                            {item.config && Object.keys(item.config).length > 3 && (
                                <Badge variant="secondary" className="text-[10px] h-5">
                                    +{Object.keys(item.config).length - 3}
                                </Badge>
                            )}
                        </div>
                      </TableCell>
                      <TableCell className="py-4 text-center">
                        <div className="flex justify-center items-center gap-2">
                          {showTrash ? (
                            item.active ? (
                              <Badge className="bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20 hover:bg-emerald-50 gap-1 px-2.5 py-0.5">
                                <CheckCircle2 className="h-3.5 w-3.5" />
                                Ativo
                              </Badge>
                            ) : (
                              <Badge variant="secondary" className="bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border-transparent gap-1 px-2.5 py-0.5">
                                <XCircle className="h-3.5 w-3.5" />
                                Inativo
                              </Badge>
                            )
                          ) : (
                            <div className="flex items-center space-x-2">
                              <Switch
                                id={`status-${item.id}`}
                                checked={item.active}
                                onCheckedChange={(checked) => {
                                  updateMutation.mutate({ 
                                    id: item.id, 
                                    data: { ...item, active: checked } 
                                  });
                                }}
                                disabled={updateMutation.isPending}
                              />
                            </div>
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
                                onClick={() => restoreMutation.mutate(item.id)}
                                title="Restaurar"
                              >
                                <RotateCcw className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                                onClick={() => setDeletingItem(item)}
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
                                onClick={() => handleOpenModal(item)}
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
                                  <DropdownMenuItem onClick={() => handleOpenModal(item)} className="gap-2 cursor-pointer">
                                    <Pencil className="h-4 w-4" /> Editar
                                  </DropdownMenuItem>
                                  <DropdownMenuItem 
                                    onClick={() => setDeletingItem(item)} 
                                    className="gap-2 text-destructive focus:text-destructive cursor-pointer"
                                  >
                                    <Trash2 className="h-4 w-4" /> Excluir
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
        </CardContent>
      </Card>
      
      {/* Create/Edit Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col p-0 border-none shadow-2xl">
          <div className="bg-zinc-900 p-8 text-white relative">
            <div className="absolute right-0 bottom-0 opacity-10">
              <Key className="h-32 w-32 translate-x-12 translate-y-12" />
            </div>
            <DialogHeader className="space-y-1">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-white/10 rounded-lg">
                  <Plus className="h-5 w-5 text-white" />
                </div>
                <DialogTitle className="text-2xl font-bold tracking-tight">
                  {editingItem ? 'Editar Integração' : 'Nova Integração'}
                </DialogTitle>
              </div>
              <DialogDescription className="text-zinc-400 text-base">
                {editingItem 
                  ? `Editando ${editingItem.name}` 
                  : 'Configure uma nova conexão com serviços externos.'}
              </DialogDescription>
            </DialogHeader>
          </div>
          
          <div className="p-8 overflow-y-auto bg-white dark:bg-zinc-950 min-h-[400px]">
            <IntegrationForm 
                initialData={editingItem}
                onSuccess={handleCloseModal}
                onCancel={handleCloseModal}
            />
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete/ForceDelete Dialog */}
      <AlertDialog open={!!deletingItem} onOpenChange={() => setDeletingItem(null)}>
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
                  Você está prestes a apagar definitivamente a integração <span className="font-bold text-zinc-900 dark:text-zinc-100">{deletingItem?.name}</span>.
                  <br />
                  <span className="mt-2 block font-medium text-red-600 bg-red-50 dark:bg-red-900/10 p-2 rounded">
                    Esta ação é irreversível.
                  </span>
                </>
              ) : (
                <>
                  Deseja mover <span className="font-bold text-zinc-900 dark:text-zinc-100">{deletingItem?.name}</span> para a lixeira?
                  <br />
                  A integração será desativada.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="sm:justify-center gap-3 mt-4">
            <AlertDialogCancel className="px-6 h-11 border-zinc-200">Não, manter</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => {
                if (deletingItem) {
                  if (showTrash) {
                    forceDeleteMutation.mutate(deletingItem.id);
                  } else {
                    deleteMutation.mutate(deletingItem.id);
                  }
                  setDeletingItem(null);
                }
              }} 
              className={cn(
                "px-8 h-11 h hover:scale-[1.02] transition-transform",
                showTrash ? "bg-red-600 hover:bg-red-700" : "bg-zinc-900 hover:bg-zinc-800"
              )}
            >
              {showTrash ? 'Sim, excluir para sempre' : 'Sim, remover'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
