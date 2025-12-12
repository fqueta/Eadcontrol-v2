import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Edit, Trash2, Loader2, Eye, MoreHorizontal } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import type { AircraftRecord } from "@/types/aircraft";

interface AircraftTableProps {
  aircraft: AircraftRecord[];
  onEdit: (aircraft: AircraftRecord) => void;
  onDelete: (aircraft: AircraftRecord) => void;
  onView?: (aircraft: AircraftRecord) => void;
  isLoading: boolean;
}

/**
 * Componente de tabela para exibir aeronaves
 * @param props - Propriedades do componente
 */
export function AircraftTable({ aircraft, onEdit, onDelete, onView, isLoading }: AircraftTableProps) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Carregando aeronaves...</span>
      </div>
    );
  }
  const ar = aircraft as any;
  // Garantir que aircraft é sempre um array
  const aircraftList = Array.isArray(ar.data) ? ar.data : [];
  console.log('aircraftList',aircraftList);
  if (aircraftList.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <p>Nenhuma aeronave encontrada.</p>
        <p className="text-sm">Clique em "Nova Aeronave" para adicionar a primeira.</p>
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Matrícula</TableHead>
          <TableHead>Proprietário</TableHead>
          <TableHead>Descrição</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Data de Criação</TableHead>
          <TableHead className="text-right">Ações</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {aircraftList.map((item) => (
          
          <TableRow key={item.id}>
            <TableCell className="font-medium">{item.matricula}</TableCell>
            <TableCell>{item.client?.name || 'N/A'}</TableCell>
            <TableCell className="max-w-xs truncate">
              {item.description || '-'}
            </TableCell>
            <TableCell>
              <Badge variant={item.active ? 'default' : 'secondary'}>
                {item.active ? 'Ativo' : 'Inativo'}
              </Badge>
            </TableCell>
            <TableCell>
              {new Date(item.created_at).toLocaleDateString('pt-BR')}
            </TableCell>
            <TableCell className="text-right">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="h-8 w-8 p-0">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {onView && (
                    <DropdownMenuItem onClick={() => onView(item)}>
                      <Eye className="mr-2 h-4 w-4" /> Visualizar
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem onClick={() => onEdit(item)}>
                    <Edit className="mr-2 h-4 w-4" /> Editar
                  </DropdownMenuItem>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                        <Trash2 className="mr-2 h-4 w-4" /> Excluir
                      </DropdownMenuItem>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
                        <AlertDialogDescription>
                          Tem certeza que deseja excluir a aeronave <strong>{item.matricula}</strong>?
                          Esta ação não pode ser desfeita.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => onDelete(item)}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          Excluir
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </DropdownMenuContent>
              </DropdownMenu>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}