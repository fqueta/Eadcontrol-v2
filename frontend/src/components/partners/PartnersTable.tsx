import { useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Pencil, Trash2, Eye } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { PartnerRecord } from '@/types/partners';
import { Mail, Phone } from 'lucide-react';

interface PartnersTableProps {
  partners: PartnerRecord[];
  onEdit: (partner: PartnerRecord) => void;
  onDelete: (partner: PartnerRecord) => void;
  onView?: (partner: PartnerRecord) => void;
  isLoading: boolean;
}

/**
 * Componente de tabela para exibição de parceiros
 * Baseado no componente ClientsTable com adaptações para partners
 */
export function PartnersTable({ partners, onEdit, onDelete, onView, isLoading }: PartnersTableProps) {
  // Garantir que partners seja sempre um array válido
  const partnersList = Array.isArray(partners) ? partners : [];
  
  if (isLoading) {
    return <div className="text-center py-4">Carregando parceiros...</div>;
  }
  
  if (partnersList.length === 0) {
    return <div className="text-center py-4">Nenhum parceiro encontrado</div>;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Nome</TableHead>
          <TableHead>Contato</TableHead>
          <TableHead>Documento</TableHead>
          <TableHead>Localização</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="text-right">Ações</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {partnersList.map((partner) => (
          <TableRow key={partner.id}>
            <TableCell className="font-medium">{partner.name}</TableCell>
            <TableCell>
              {partner.email && <div className="flex items-center gap-1"><Mail className="h-3 w-3" /> {partner.email}</div>}
              {partner.config?.celular && <div className="flex items-center gap-1"><Phone className="h-3 w-3" /> {partner.config.celular}</div>}
            </TableCell>
            <TableCell>
              {partner.tipo_pessoa === 'pf' ? partner.cpf : partner.cnpj}
            </TableCell>
            <TableCell>
              {partner.config?.cidade && `${partner.config.cidade}/${partner.config.uf}`}
            </TableCell>
            <TableCell>
              <Badge className={partner.ativo === 's' ? "success" : "destructive"}>
                {partner.ativo === 's' ? "Ativo" : "Inativo"}
              </Badge>
            </TableCell>
            <TableCell className="text-right">
              <DropdownMenu>
                <DropdownMenuTrigger>
                  <MoreHorizontal className="h-4 w-4" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {onView && (
                    <DropdownMenuItem onClick={() => onView(partner)}>
                      <Eye className="mr-2 h-4 w-4" /> Visualizar
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem onClick={() => onEdit(partner)}>
                    <Pencil className="mr-2 h-4 w-4" /> Editar
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onDelete(partner)}>
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