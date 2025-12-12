import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Pencil, Trash2, Eye, Car, Plane } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { ServiceObjectRecord } from '@/services/serviceObjectsService';

interface ServiceObjectsTableProps {
  serviceObjects: ServiceObjectRecord[];
  onEdit: (serviceObject: ServiceObjectRecord) => void;
  onDelete: (serviceObject: ServiceObjectRecord) => void;
  onView?: (serviceObject: ServiceObjectRecord) => void;
  isLoading: boolean;
}

export function ServiceObjectsTable({ 
  serviceObjects, 
  onEdit, 
  onDelete, 
  onView, 
  isLoading 
}: ServiceObjectsTableProps) {
  // Garantir que serviceObjects seja sempre um array válido
  const serviceObjectsList = Array.isArray(serviceObjects) ? serviceObjects : [];
  
  if (isLoading) {
    return <div className="text-center py-4">Carregando objetos de serviço...</div>;
  }
  
  if (serviceObjectsList.length === 0) {
    return <div className="text-center py-4">Nenhum objeto de serviço encontrado</div>;
  }

  const getTypeIcon = (type: string) => {
    return type === 'automovel' ? <Car className="h-4 w-4" /> : <Plane className="h-4 w-4" />;
  };

  const getTypeLabel = (type: string) => {
    return type === 'automovel' ? 'Automóvel' : 'Aeronave';
  };

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Tipo</TableHead>
          <TableHead>Identificação</TableHead>
          <TableHead>Fabricante/Modelo</TableHead>
          <TableHead>Ano</TableHead>
          <TableHead>Cor</TableHead>
          <TableHead>Cliente</TableHead>
          <TableHead className="text-right">Ações</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {serviceObjectsList.map((serviceObject) => (
          <TableRow key={serviceObject.id}>
            <TableCell>
              <div className="flex items-center gap-2">
                {getTypeIcon(serviceObject.type)}
                <span>{getTypeLabel(serviceObject.type)}</span>
              </div>
            </TableCell>
            <TableCell className="font-medium">
              {serviceObject.identifier_primary}
            </TableCell>
            <TableCell>
              <div>
                <div className="font-medium">{serviceObject.manufacturer}</div>
                <div className="text-sm text-muted-foreground">{serviceObject.model}</div>
              </div>
            </TableCell>
            <TableCell>{serviceObject.year}</TableCell>
            <TableCell>{serviceObject.color}</TableCell>
            <TableCell>
              {serviceObject.client?.name || 'N/A'}
            </TableCell>
            <TableCell className="text-right">
              <DropdownMenu>
                <DropdownMenuTrigger>
                  <MoreHorizontal className="h-4 w-4" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {onView && (
                    <DropdownMenuItem onClick={() => onView(serviceObject)}>
                      <Eye className="mr-2 h-4 w-4" /> Visualizar
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem onClick={() => onEdit(serviceObject)}>
                    <Pencil className="mr-2 h-4 w-4" /> Editar
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onDelete(serviceObject)}>
                    <Trash2 className="mr-2 h-4 w-4" /> Excluir
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}