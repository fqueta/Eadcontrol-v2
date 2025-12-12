import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { 
  Plus, 
  Search, 
  MoreHorizontal, 
  Edit, 
  Trash2, 
  Eye,
  Wrench,
  AlertTriangle,
  Clock
} from "lucide-react";
import type { Service } from "@/types/services";
import { SKILL_LEVELS } from "@/types/services";

interface ServicesTableProps {
  services: Service[];
  isLoading: boolean;
  error: any;
  onNewService: () => void;
  onEditService: (service: Service) => void;
  onDeleteService: (service: Service) => void;
  onRefetch: () => void;
}

/**
 * Componente de tabela para listagem e gerenciamento de serviços
 * Inclui funcionalidades de busca, filtros e ações CRUD
 */
export default function ServicesTable({
  services,
  isLoading,
  error,
  onNewService,
  onEditService,
  onDeleteService,
  onRefetch
}: ServicesTableProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const navigate = useNavigate();

  /**
   * Navega para a página de visualização do serviço
   */
  const handleViewService = (service: Service) => {
    navigate(`/services/${service.id}`);
  };

  /**
   * Obtém o label do nível de habilidade
   */
  const getSkillLevelLabel = (skillLevel: string) => {
    const level = SKILL_LEVELS.find(level => level.value === skillLevel);
    return level?.label || skillLevel;
  };

  /**
   * Obtém a cor do badge baseado no nível de habilidade
   */
  const getSkillLevelVariant = (skillLevel: string): "default" | "secondary" | "destructive" | "outline" => {
    switch (skillLevel) {
      case 'basic':
        return 'secondary';
      case 'intermediate':
        return 'outline';
      case 'advanced':
        return 'default';
      case 'expert':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  const filteredServices = services.filter(service =>
    service.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    service.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (service.description || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Lista de Serviços</CardTitle>
        <CardDescription>
          Visualize e gerencie todos os serviços cadastrados
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center space-x-2 mb-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar serviços..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8"
            />
          </div>
        </div>

        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Serviço</TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead>Preço</TableHead>
                <TableHead>Duração</TableHead>
                <TableHead>Nível</TableHead>
                <TableHead>Materiais</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8">
                    <div className="flex items-center justify-center space-x-2">
                      <Wrench className="h-4 w-4 animate-spin" />
                      <span>Carregando serviços...</span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : error ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8">
                    <div className="flex flex-col items-center space-y-2 text-destructive">
                      <AlertTriangle className="h-8 w-8" />
                      <div>
                        <p className="font-medium">Erro ao carregar serviços</p>
                        <p className="text-sm text-muted-foreground">
                          {error?.message || 'Não foi possível conectar com o servidor'}
                        </p>
                      </div>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={onRefetch}
                        className="mt-2"
                      >
                        Tentar novamente
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ) : !services || services.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8">
                    <div className="flex flex-col items-center space-y-2 text-muted-foreground">
                      <Wrench className="h-8 w-8" />
                      <div>
                        <p className="font-medium">Nenhum serviço cadastrado</p>
                        <p className="text-sm">Comece criando seu primeiro serviço</p>
                      </div>
                      <Button 
                        onClick={onNewService}
                        size="sm"
                        className="mt-2"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Criar serviço
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ) : filteredServices.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8">
                    <div className="flex flex-col items-center space-y-2 text-muted-foreground">
                      <Search className="h-8 w-8" />
                      <div>
                        <p className="font-medium">Nenhum serviço encontrado</p>
                        <p className="text-sm">Tente ajustar os filtros de busca</p>
                      </div>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredServices.map((service) => (
                  <TableRow key={service.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{service.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {service.description}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{service.category}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm font-medium">
                        R$ {service.price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-1">
                        <Clock className="h-3 w-3 text-muted-foreground" />
                        <span className="text-sm">
                          {service.estimatedDuration} {service.unit}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={getSkillLevelVariant(service.skillLevel)}>
                        {getSkillLevelLabel(service.skillLevel)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={service.requiresMaterials ? "default" : "secondary"}>
                        {service.requiresMaterials ? "Sim" : "Não"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={service.active ? "default" : "secondary"}>
                        {service.active ? "Ativo" : "Inativo"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <span className="sr-only">Abrir menu</span>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Ações</DropdownMenuLabel>
                          <DropdownMenuItem onClick={() => handleViewService(service)}>
                            <Eye className="mr-2 h-4 w-4" />
                            Visualizar
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => onEditService(service)}>
                            <Edit className="mr-2 h-4 w-4" />
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem 
                            className="text-destructive"
                            onClick={() => onDeleteService(service)}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Excluir
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}