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
  Key,
  ShieldAlert,
  Cloud,
  Video,
  CreditCard,
  Zap,
  Settings2,
  Lock
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
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
import { useAuth } from '@/contexts/AuthContext';

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
import { R2ConfigDialog } from '@/components/settings/integrations/R2ConfigDialog';
import { VimeoConfigDialog } from '@/components/settings/integrations/VimeoConfigDialog';
import { Switch } from '@/components/ui/switch';

export default function IntegrationsList() {
  const { user } = useAuth();
  const isGroup1 = Number(user?.permission_id ?? 0) === 1;

  const [search, setSearch] = useState('');
  const [showTrash, setShowTrash] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ApiCredential | null>(null);
  const [deletingItem, setDeletingItem] = useState<ApiCredential | null>(null);

  // Modais específicos
  const [isR2ModalOpen, setIsR2ModalOpen] = useState(false);
  const [isVimeoModalOpen, setIsVimeoModalOpen] = useState(false);

  const { data: listData, isLoading: isLoadingList, refetch: refetchList } = useApiCredentialsList({ 
    page: 1, 
    per_page: 100
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

  // Credenciais oficiais mapeadas
  const r2Credential = useMemo(() => items.find(i => i.slug === 'cloudflare-r2'), [items]);
  const vimeoCredential = useMemo(() => items.find(i => i.slug === 'vimeo'), [items]);
  const asaasCredential = useMemo(() => items.find(i => i.slug === 'asaas'), [items]);

  const filteredItems = useMemo(() => {
    if (!search.trim()) return items;
    const searchLower = search.toLowerCase();
    return items.filter(item => 
      item.name.toLowerCase().includes(searchLower) ||
      (item.slug && item.slug.toLowerCase().includes(searchLower))
    );
  }, [items, search]);

  const handleOpenModal = (item?: ApiCredential) => {
    setEditingItem(item || null);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingItem(null);
    refetchList();
  };

  // Bloqueio amigável para não-Grupo 1
  if (!isGroup1) {
    return (
      <div className="container-fluid py-16 px-4 md:px-8 max-w-4xl mx-auto animate-in fade-in duration-500">
        <Card className="border-amber-200 dark:border-amber-900/60 bg-amber-50/50 dark:bg-amber-950/20 shadow-xl">
          <CardHeader className="text-center pb-2">
            <div className="mx-auto w-16 h-16 rounded-2xl bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center mb-3">
              <ShieldAlert className="w-8 h-8 text-amber-600 dark:text-amber-400" />
            </div>
            <CardTitle className="text-2xl font-bold text-amber-900 dark:text-amber-200">
              Acesso Restrito ao Grupo 1 (Master)
            </CardTitle>
            <CardDescription className="text-amber-800/80 dark:text-amber-400/80 text-base max-w-xl mx-auto mt-2">
              Apenas administradores do <strong>Grupo 1 (Desenvolvedores / Master)</strong> possuem autorização para gerenciar credenciais de integrações, chaves de API e tokens de serviços externos da plataforma.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center pt-4">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-200/60 dark:bg-amber-900/60 text-xs font-semibold text-amber-900 dark:text-amber-200">
              <Lock className="w-3.5 h-3.5" />
              Nível atual do seu usuário: Grupo {user?.permission_id ?? 'Não identificado'}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container-fluid py-8 px-4 md:px-8 space-y-8 animate-in fade-in duration-500">
      {/* Cabeçalho */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-1">
          <div className="flex items-center gap-3 mb-1">
            <div className="p-2.5 bg-primary/10 rounded-xl text-primary">
              <ServerIcon className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">Integrações</h1>
                <Badge variant="outline" className="border-amber-400 bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 text-xs font-semibold">
                  Grupo 1 Master
                </Badge>
              </div>
              <p className="text-muted-foreground text-sm">
                Gerencie credenciais de armazenamento, provedores de streaming e gateways externos.
              </p>
            </div>
          </div>
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

      {/* Cards em Destaque (Oficiais) */}
      {!showTrash && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Card Cloudflare R2 */}
          <Card className="border border-amber-200 dark:border-amber-900/50 bg-gradient-to-br from-amber-50/40 via-white to-amber-50/20 dark:from-amber-950/20 dark:via-zinc-900 dark:to-amber-950/10 shadow-md hover:shadow-lg transition-all duration-200">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="p-3 bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-xl">
                  <Cloud className="w-6 h-6" />
                </div>
                {r2Credential ? (
                  <Badge className={r2Credential.active ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/20" : "bg-neutral-500/15 text-neutral-600 border-neutral-500/20"}>
                    {r2Credential.active ? "Conectado" : "Desativado"}
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-zinc-500 border-dashed">
                    Não configurado
                  </Badge>
                )}
              </div>
              <CardTitle className="text-lg font-bold mt-2">Cloudflare R2</CardTitle>
              <CardDescription className="text-xs">
                Armazenamento de vídeos de alta velocidade e streaming padrão YouTube sem custo de tráfego.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 pt-1">
              <div className="text-xs space-y-1 text-muted-foreground bg-amber-50/60 dark:bg-amber-950/30 p-2.5 rounded-lg border border-amber-100 dark:border-amber-900/40">
                <div className="flex justify-between">
                  <span>Bucket:</span>
                  <span className="font-mono font-medium text-foreground">{r2Credential?.config?.bucket || 'Não definido'}</span>
                </div>
                <div className="flex justify-between">
                  <span>Account ID:</span>
                  <span className="font-mono font-medium text-foreground">
                    {r2Credential?.config?.account_id ? `${String(r2Credential.config.account_id).substring(0, 10)}...` : 'Não definido'}
                  </span>
                </div>
              </div>
              <Button 
                onClick={() => setIsR2ModalOpen(true)}
                className="w-full gap-2 bg-amber-600 hover:bg-amber-700 text-white shadow-sm"
              >
                <Zap className="w-4 h-4 text-amber-200" />
                Configurar R2 & Testar
              </Button>
            </CardContent>
          </Card>

          {/* Card Vimeo */}
          <Card className="border border-blue-200 dark:border-blue-900/50 bg-gradient-to-br from-blue-50/40 via-white to-blue-50/20 dark:from-blue-950/20 dark:via-zinc-900 dark:to-blue-950/10 shadow-md hover:shadow-lg transition-all duration-200">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="p-3 bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-xl">
                  <Video className="w-6 h-6" />
                </div>
                {vimeoCredential ? (
                  <Badge className={vimeoCredential.active ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/20" : "bg-neutral-500/15 text-neutral-600 border-neutral-500/20"}>
                    {vimeoCredential.active ? "Conectado" : "Desativado"}
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-zinc-500 border-dashed">
                    Não configurado
                  </Badge>
                )}
              </div>
              <CardTitle className="text-lg font-bold mt-2">Vimeo</CardTitle>
              <CardDescription className="text-xs">
                Integração para visualização, incorporação e migração de vídeos legados hospedados no Vimeo.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 pt-1">
              <div className="text-xs space-y-1 text-muted-foreground bg-blue-50/60 dark:bg-blue-950/30 p-2.5 rounded-lg border border-blue-100 dark:border-blue-900/40">
                <div className="flex justify-between">
                  <span>Token:</span>
                  <span className="font-mono font-medium text-foreground">
                    {vimeoCredential ? '•••••••• (configurado)' : 'Não informado'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Permissão:</span>
                  <span className="font-medium text-foreground">public, private, video_files</span>
                </div>
              </div>
              <Button 
                onClick={() => setIsVimeoModalOpen(true)}
                className="w-full gap-2 bg-blue-600 hover:bg-blue-700 text-white shadow-sm"
              >
                <Settings2 className="w-4 h-4 text-blue-200" />
                Configurar Vimeo & Testar
              </Button>
            </CardContent>
          </Card>

          {/* Card Asaas */}
          <Card className="border border-emerald-200 dark:border-emerald-900/50 bg-gradient-to-br from-emerald-50/40 via-white to-emerald-50/20 dark:from-emerald-950/20 dark:via-zinc-900 dark:to-emerald-950/10 shadow-md hover:shadow-lg transition-all duration-200">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="p-3 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-xl">
                  <CreditCard className="w-6 h-6" />
                </div>
                {asaasCredential ? (
                  <Badge className={asaasCredential.active ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/20" : "bg-neutral-500/15 text-neutral-600 border-neutral-500/20"}>
                    {asaasCredential.active ? "Configurado" : "Desativado"}
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-zinc-500 border-dashed">
                    Não configurado
                  </Badge>
                )}
              </div>
              <CardTitle className="text-lg font-bold mt-2">Asaas</CardTitle>
              <CardDescription className="text-xs">
                Gateway de pagamentos para cobranças automáticas via PIX, Boleto e Cartão de Crédito.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 pt-1">
              <div className="text-xs space-y-1 text-muted-foreground bg-emerald-50/60 dark:bg-emerald-950/30 p-2.5 rounded-lg border border-emerald-100 dark:border-emerald-900/40">
                <div className="flex justify-between">
                  <span>Ambiente:</span>
                  <span className="font-mono font-medium text-foreground">
                    {String(asaasCredential?.config?.environment || 'produção').toUpperCase()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Chave API:</span>
                  <span className="font-mono font-medium text-foreground">
                    {asaasCredential ? '••••••••••••••••' : 'Não definida'}
                  </span>
                </div>
              </div>
              <Button 
                onClick={() => handleOpenModal(asaasCredential)}
                className="w-full gap-2 bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
              >
                <Settings2 className="w-4 h-4 text-emerald-200" />
                {asaasCredential ? 'Gerenciar Asaas' : 'Configurar Asaas'}
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Lista de Outras Credenciais e APIs */}
      <Card className="border-none shadow-xl bg-white/50 backdrop-blur-sm dark:bg-zinc-900/50">
        <CardHeader className="pb-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-xl font-bold">Todas as Credenciais de API</CardTitle>
              <CardDescription className="text-xs">
                Visualização detalhada e gerenciamento de endpoints REST e Webhooks customizados.
              </CardDescription>
            </div>
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Buscar por nome ou slug..." 
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 bg-white dark:bg-zinc-900"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="rounded-md border-t border-zinc-100 dark:border-zinc-800">
            <Table>
              <TableHeader>
                <TableRow className="bg-zinc-50/50 dark:bg-zinc-900/50">
                  <TableHead className="w-[80px]">Status</TableHead>
                  <TableHead>Nome</TableHead>
                  <TableHead>Slug</TableHead>
                  <TableHead>Chaves Configuradas</TableHead>
                  <TableHead className="w-[120px] text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-32 text-center text-muted-foreground">
                      Carregando integrações...
                    </TableCell>
                  </TableRow>
                ) : filteredItems.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-32 text-center text-muted-foreground">
                      {search ? 'Nenhuma integração encontrada para a busca.' : 'Nenhuma integração cadastrada.'}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredItems.map((item) => (
                    <TableRow key={item.id} className="hover:bg-zinc-50/80 dark:hover:bg-zinc-800/50">
                      <TableCell>
                        <Switch 
                          checked={item.active} 
                          onCheckedChange={(checked) => {
                            updateMutation.mutate({
                              id: item.id,
                              data: { active: checked }
                            });
                          }}
                          disabled={showTrash}
                        />
                      </TableCell>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <span className="text-zinc-900 dark:text-zinc-100 font-semibold">{item.name}</span>
                          {item.slug === 'cloudflare-r2' && (
                            <Badge variant="outline" className="text-[10px] bg-amber-50 text-amber-700 border-amber-200">
                              R2
                            </Badge>
                          )}
                          {item.slug === 'vimeo' && (
                            <Badge variant="outline" className="text-[10px] bg-blue-50 text-blue-700 border-blue-200">
                              Vimeo
                            </Badge>
                          )}
                          {item.slug === 'asaas' && (
                            <Badge variant="outline" className="text-[10px] bg-emerald-50 text-emerald-700 border-emerald-200">
                              Asaas
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="font-mono text-xs">
                          {item.slug || 'custom'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {item.config && Object.keys(item.config).length > 0 ? (
                            Object.keys(item.config).map((key) => (
                              <Badge key={key} variant="outline" className="text-[11px] font-mono">
                                {key}
                              </Badge>
                            ))
                          ) : (
                            <span className="text-xs text-muted-foreground">Nenhuma chave</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          {showTrash ? (
                            <>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => restoreMutation.mutate(item.id)}
                                title="Restaurar"
                                className="h-8 w-8 p-0 text-zinc-600 hover:text-zinc-900"
                              >
                                <RotateCcw className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setDeletingItem(item)}
                                title="Excluir Definitivamente"
                                className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </>
                          ) : (
                            <>
                              {item.slug === 'cloudflare-r2' ? (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setIsR2ModalOpen(true)}
                                  className="h-8 w-8 p-0 text-amber-600 hover:text-amber-700"
                                  title="Configurar R2"
                                >
                                  <Settings2 className="h-4 w-4" />
                                </Button>
                              ) : item.slug === 'vimeo' ? (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setIsVimeoModalOpen(true)}
                                  className="h-8 w-8 p-0 text-blue-600 hover:text-blue-700"
                                  title="Configurar Vimeo"
                                >
                                  <Settings2 className="h-4 w-4" />
                                </Button>
                              ) : (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleOpenModal(item)}
                                  className="h-8 w-8 p-0 text-zinc-600 hover:text-zinc-900"
                                  title="Editar"
                                >
                                  <Pencil className="h-4 w-4" />
                                </Button>
                              )}
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                    <MoreVertical className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuLabel>Ações</DropdownMenuLabel>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem onClick={() => handleOpenModal(item)} className="gap-2 cursor-pointer">
                                    <Pencil className="h-4 w-4" /> Editar Geral
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
      
      {/* Modal Específico Cloudflare R2 */}
      <R2ConfigDialog
        open={isR2ModalOpen}
        onOpenChange={setIsR2ModalOpen}
        initialCredential={r2Credential}
        onSaved={refetchList}
      />

      {/* Modal Específico Vimeo */}
      <VimeoConfigDialog
        open={isVimeoModalOpen}
        onOpenChange={setIsVimeoModalOpen}
        initialCredential={vimeoCredential}
        onSaved={refetchList}
      />

      {/* Modal Genérico Create/Edit */}
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

      {/* Confirmação de Exclusão */}
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
                "px-8 h-11 hover:scale-[1.02] transition-transform",
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
