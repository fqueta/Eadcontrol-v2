import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  MoreHorizontal, 
  Pencil, 
  Trash2, 
  Eye, 
  RotateCcw,
  Phone,
  User,
  UserPlus,
  AlertTriangle
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ClientRecord } from '@/types/clients';
import { useUsersList } from '@/hooks/users';
import { useRestoreClient, usePromoteClient } from '@/hooks/clients';
import { phoneApplyMask } from '@/lib/masks/phone-apply-mask';

interface ClientsTableProps {
  clients: ClientRecord[];
  onEdit: (client: ClientRecord) => void;
  onDelete: (client: ClientRecord) => void;
  onForceDelete?: (client: ClientRecord) => void;
  isLoading: boolean;
  /**
   * Indica se a visualização atual é a Lixeira.
   * When true, shows a visual banner warning the list is filtering deleted records.
   */
  trashEnabled?: boolean;
}

/**
 * Componente de Tabela de Clientes
 * Renders client rows with owner and status. When `trashEnabled` is true,
 * shows a purple banner at the top, hides the Delete action, e exibe "Restaurar".
 */
export function ClientsTable({ clients, onEdit, onDelete, onForceDelete, isLoading, trashEnabled }: ClientsTableProps) {
  const navigate = useNavigate();
  const location = useLocation();
  // Garantir que clients seja sempre um array válido
  const clientsList = Array.isArray(clients) ? clients : [];
  // Hook de restauração
  const restoreClientMutation = useRestoreClient();
  // Hook de promoção
  const promoteClientMutation = usePromoteClient();
  
  // Estado para o modal de promoção
  const [promoteClient, setPromoteClient] = useState<ClientRecord | null>(null);
  
  // Buscar lista de usuários para identificar o proprietário
  const { data: usersData } = useUsersList();
  const usersList = usersData?.data || [];
  
  // Função para obter o nome do proprietário pelo ID do autor
  const getOwnerName = (autorId: string) => {
    const user = usersList.find(user => user.id === autorId);
    return user?.name || 'Não identificado';
  };
  // console.log('trashEnabled:', trashEnabled);
  
  // Função para formatar o status
  const getStatusBadge = (status: string) => {
    const statusMap = {
      'actived': { label: 'Ativo', variant: 'default' as const },
      'inactived': { label: 'Inativo', variant: 'destructive' as const },
      'pre_registred': { label: 'Pré-cadastro', variant: 'secondary' as const }
    };
    
    const statusInfo = statusMap[status as keyof typeof statusMap] || { label: status || 'Não definido', variant: 'outline' as const };
    
    return (
      <Badge variant={statusInfo.variant}>
        {statusInfo.label}
      </Badge>
    );
  };
  
  if (isLoading) {
    return <div className="text-center py-4">Carregando clientes...</div>;
  }
  
  if (clientsList.length === 0) {
    return (
      <div className="space-y-2">
        {trashEnabled && (
          <div className="flex items-center gap-2 rounded-md border border-purple-200 bg-purple-50 px-3 py-2 text-sm text-purple-800">
            <Trash2 className="h-4 w-4" />
            <span>Exibindo itens da Lixeira — registros excluídos.</span>
          </div>
        )}
        <div className="text-center py-4">Nenhum cliente encontrado</div>
      </div>
    );
  }
  // console.log('Clientes:', clientsList);
  
  return (
    <div className="space-y-2">
      {trashEnabled && (
        <div className="flex items-center gap-2 rounded-md border border-purple-200 bg-purple-50 px-3 py-2 text-sm text-purple-800">
          <Trash2 className="h-4 w-4" />
          <span>Exibindo itens da Lixeira — registros excluídos.</span>
        </div>
      )}
      <Table>
        <TableHeader className="bg-slate-50/80 dark:bg-slate-800/80 border-b border-slate-200/80">
          <TableRow>
            <TableHead className="px-3 py-2 text-[11px] font-black uppercase tracking-wider text-muted-foreground/70">Nome</TableHead>
            <TableHead className="px-3 py-2 text-[11px] font-black uppercase tracking-wider text-muted-foreground/70">CPF / CNPJ</TableHead>
            <TableHead className="px-3 py-2 text-[11px] font-black uppercase tracking-wider text-muted-foreground/70">Email</TableHead>
            <TableHead className="px-3 py-2 text-[11px] font-black uppercase tracking-wider text-muted-foreground/70">Celular</TableHead>
            <TableHead className="px-3 py-2 text-[11px] font-black uppercase tracking-wider text-muted-foreground/70">Consultor</TableHead>
            <TableHead className="px-3 py-2 text-[11px] font-black uppercase tracking-wider text-muted-foreground/70">Status</TableHead>
            <TableHead className="px-3 py-2 text-right text-[11px] font-black uppercase tracking-wider text-muted-foreground/70">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody className="divide-y divide-slate-100 dark:divide-slate-800">
          {clientsList.map((client) => (
            <TableRow 
              key={client.id}
              onDoubleClick={() => navigate(`/admin/clients/${client.id}/view`)}
              className="cursor-pointer hover:bg-slate-50/80 dark:hover:bg-slate-800/80 transition-all border-transparent"
              title={`Visualizar detalhes do cliente ${client.name} com dois cliques`}
            >
              <TableCell className="px-3 py-2 font-medium">
                <div className="flex items-center gap-2.5">
                  <Avatar className="h-7 w-7 rounded-lg border border-slate-200 dark:border-slate-800 shrink-0">
                    <AvatarImage src={client.foto_perfil || undefined} alt={client.name} />
                    <AvatarFallback className="bg-primary/10 text-primary font-black text-[10px] uppercase">
                      {client.name.substring(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col min-w-0">
                    <span className="font-bold text-xs text-foreground/90 truncate">{client.name}</span>
                    {client.razao && (
                      <span className="text-[9px] text-muted-foreground uppercase tracking-tight truncate">{client.razao}</span>
                    )}
                  </div>
                </div>
              </TableCell>
              <TableCell className="px-3 py-2 font-mono">
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-foreground/80">
                    {client.tipo_pessoa === 'pf' ? (client.cpf || '—') : (client.cnpj || '—')}
                  </span>
                  <span className="text-[9px] text-muted-foreground/60 uppercase">
                    {client.tipo_pessoa === 'pf' ? 'CPF' : 'CNPJ'}
                  </span>
                </div>
              </TableCell>
              <TableCell className="px-3 py-2">
                <span className="text-xs text-muted-foreground truncate block max-w-[200px]">{client.email || '—'}</span>
              </TableCell>
              <TableCell className="px-3 py-2">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-mono">
                  <Phone className="h-3 w-3 text-muted-foreground/60 shrink-0" />
                  <span>
                    {phoneApplyMask(client.celular || '') || '—'}
                  </span>
                </div>
              </TableCell>
              <TableCell className="px-3 py-2">
                <div className="flex items-center gap-1.5">
                  <div className="h-5 w-5 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
                    <User className="h-3 w-3 text-muted-foreground" />
                  </div>
                  <span className="text-xs font-medium text-foreground/80 truncate">{client.autor_name || '—'}</span>
                </div>
              </TableCell>
              <TableCell className="px-3 py-2">
                {getStatusBadge(client.status)}
              </TableCell>
              <TableCell className="px-3 py-2 text-right">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="inline-flex h-7 w-7 items-center justify-center rounded-lg border hover:bg-slate-100 transition-colors">
                      <MoreHorizontal className="h-3.5 w-3.5 text-muted-foreground" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-[170px] rounded-xl shadow-xl p-1">
                    <DropdownMenuItem onClick={() => navigate(`/admin/clients/${client.id}/view`, { state: { from: location } })} className="cursor-pointer gap-2 font-bold text-xs py-1.5">
                      <Eye className="h-3.5 w-3.5 text-primary" /> Visualizar
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => navigate(`/admin/clients/${client.id}/edit`, { state: { from: location } })} className="cursor-pointer gap-2 font-bold text-xs py-1.5">
                      <Pencil className="h-3.5 w-3.5 text-slate-500" /> Editar
                    </DropdownMenuItem>
                    {trashEnabled ? (
                      <>
                        <DropdownMenuItem 
                          onClick={() => restoreClientMutation.mutate(client.id)}
                          disabled={restoreClientMutation.isPending}
                          className="cursor-pointer gap-2 font-bold text-xs py-1.5"
                        >
                          <RotateCcw className="h-3.5 w-3.5 text-purple-600" /> Restaurar
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={() => onForceDelete?.(client)}
                          className="text-red-600 focus:text-red-700 focus:bg-red-50 cursor-pointer gap-2 font-bold text-xs py-1.5"
                        >
                          <Trash2 className="h-3.5 w-3.5" /> Excluir permanentemente
                        </DropdownMenuItem>
                      </>
                    ) : (
                      <>
                        <DropdownMenuItem 
                          onClick={() => setPromoteClient(client)}
                          disabled={promoteClientMutation.isPending}
                          className="text-blue-600 focus:text-blue-700 focus:bg-blue-50 cursor-pointer gap-2 font-bold text-xs py-1.5"
                        >
                          <UserPlus className="h-3.5 w-3.5" /> Promover p/ Usuário
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onDelete(client)} className="text-red-500 focus:bg-red-50 cursor-pointer gap-2 font-bold text-xs py-1.5">
                          <Trash2 className="h-3.5 w-3.5" /> Excluir
                        </DropdownMenuItem>
                      </>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <AlertDialog open={!!promoteClient} onOpenChange={(open) => !open && setPromoteClient(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-blue-600" />
              Confirmar Promoção
            </AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja promover o cliente <strong>{promoteClient?.name}</strong> para usuário?
              <br />
              Esta ação concederá acesso ao painel administrativo com permissões de usuário regular.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (promoteClient) {
                  promoteClientMutation.mutate(promoteClient.id);
                  setPromoteClient(null);
                }
              }}
              className="bg-blue-600 hover:bg-blue-700"
            >
              Confirmar Promoção
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}