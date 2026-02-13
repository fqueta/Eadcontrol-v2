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
  User 
} from "lucide-react";
import { ClientRecord } from '@/types/clients';
import { useUsersList } from '@/hooks/users';
import { useRestoreClient } from '@/hooks/clients';
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
        <TableHeader>
          <TableRow>
            <TableHead>Nome</TableHead>
            <TableHead>CPF / CNPJ</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Celular</TableHead>
            <TableHead>Consultor</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {clientsList.map((client) => (
            <TableRow 
              key={client.id}
              onDoubleClick={() => navigate(`/admin/clients/${client.id}/view`)}
              className="cursor-pointer hover:bg-muted/50"
              title={`Visualizar detalhes do cliente ${client.name} com dois cliques`}
            >
              <TableCell className="font-medium">
                <div className="flex items-center gap-3">
                  <Avatar className="h-9 w-9">
                    <AvatarImage src={client.foto_perfil || undefined} alt={client.name} />
                    <AvatarFallback className="bg-primary/10 text-primary font-bold">
                      {client.name.substring(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col">
                    <span className="font-semibold text-sm text-foreground">{client.name}</span>
                    {client.razao && (
                      <span className="text-[10px] text-muted-foreground uppercase tracking-tight">{client.razao}</span>
                    )}
                  </div>
                </div>
              </TableCell>
              <TableCell>
                <div className="flex flex-col">
                  <span className="text-sm font-medium">
                    {client.tipo_pessoa === 'pf' ? (client.cpf || '—') : (client.cnpj || '—')}
                  </span>
                  <span className="text-[10px] text-muted-foreground uppercase">
                    {client.tipo_pessoa === 'pf' ? 'CPF' : 'CNPJ'}
                  </span>
                </div>
              </TableCell>
              <TableCell>
                <span className="text-sm text-muted-foreground">{client.email || '—'}</span>
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Phone className="h-3 w-3" />
                  <span>
                    {phoneApplyMask(client.celular || '') || '—'}
                  </span>
                </div>
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  <div className="h-6 w-6 rounded-full bg-muted flex items-center justify-center">
                    <User className="h-3 w-3 text-muted-foreground" />
                  </div>
                  <span className="text-sm">{client.autor_name || '—'}</span>
                </div>
              </TableCell>
              <TableCell>
                {/* Debug temporário */}
                <div style={{fontSize: '10px', color: 'gray', marginBottom: '4px'}}>
                  {/* Debug: {JSON.stringify({ativo: client.status, type: typeof client.status})} */}
                </div>
                {getStatusBadge(client.status)}
              </TableCell>
              <TableCell className="text-right">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="flex h-8 w-8 items-center justify-center rounded-md border hover:bg-muted">
                      <MoreHorizontal className="h-4 w-4" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => navigate(`/admin/clients/${client.id}/view`, { state: { from: location } })}>
                      <Eye className="mr-2 h-4 w-4" /> Visualizar
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => navigate(`/admin/clients/${client.id}/edit`, { state: { from: location } })}>
                      <Pencil className="mr-2 h-4 w-4" /> Editar
                    </DropdownMenuItem>
                    {trashEnabled ? (
                      <>
                        <DropdownMenuItem 
                          onClick={() => restoreClientMutation.mutate(client.id)}
                          disabled={restoreClientMutation.isPending}
                        >
                          <RotateCcw className="mr-2 h-4 w-4" /> Restaurar
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={() => onForceDelete?.(client)}
                          className="text-red-600 focus:text-red-700 focus:bg-red-50"
                        >
                          <Trash2 className="mr-2 h-4 w-4" /> Excluir permanentemente
                        </DropdownMenuItem>
                      </>
                    ) : (
                      <DropdownMenuItem onClick={() => onDelete(client)}>
                        <Trash2 className="mr-2 h-4 w-4" /> Excluir
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}