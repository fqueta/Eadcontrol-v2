import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { useServicesList, useCreateService, useUpdateService, useDeleteService, useServiceCategories, useServiceUnits } from "@/hooks/services";
import type { Service, CreateServiceInput, UpdateServiceInput } from "@/types/services";
import { Plus } from "lucide-react";
import ServicesStats from "@/components/services/ServicesStats";
import ServicesTable from "@/components/services/ServicesTable";
import ServiceFormDialog from "@/components/services/ServiceFormDialog";
import { ServiceFormData, serviceSchema } from "@/components/services/ServiceForm";

/**
 * Página principal de gerenciamento de serviços
 * Inclui listagem, criação, edição e exclusão de serviços
 */
export default function Services() {
  const [searchTerm, setSearchTerm] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);

  // Hooks para serviços
  const { data: servicesData, isLoading: isLoadingServices, error: servicesError, refetch } = useServicesList();
  const createMutation = useCreateService({
    onSuccess: () => {
      toast.success('Serviço criado com sucesso!');
      setIsDialogOpen(false);
      setEditingService(null);
      refetch();
      form.reset();
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Erro ao criar serviço');
    }
  });
  const updateMutation = useUpdateService({
    onSuccess: () => {
      toast.success('Serviço atualizado com sucesso!');
      setIsDialogOpen(false);
      setEditingService(null);
      refetch();
      form.reset();
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Erro ao atualizar serviço');
    }
  });
  const deleteMutation = useDeleteService({
    onSuccess: () => {
      toast.success('Serviço excluído com sucesso!');
      refetch();
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Erro ao excluir serviço');
    }
  });

  // Hooks para categorias e unidades
  const { data: categories = [], isLoading: isLoadingCategories, error: categoriesError } = useServiceCategories();
  const { data: units = [], isLoading: isLoadingUnits, error: unitsError } = useServiceUnits();

  // Extrai os serviços da resposta paginada
  const anyService =  servicesData as any;
  const services = Array.isArray(anyService) ? anyService : anyService?.data || [];

  const form = useForm<ServiceFormData>({
    resolver: zodResolver(serviceSchema),
    defaultValues: {
      name: "",
      description: "",
      category: "",
      price: 0,
      estimatedDuration: 60,
      unit: "minutos",
      active: true,
      requiresMaterials: false,
      skillLevel: "basic",
    },
  });

  /**
   * Abre o diálogo para criar um novo serviço
   */
  const handleNewService = () => {
    setEditingService(null);
    form.reset({
      name: "",
      description: "",
      category: "",
      price: 0,
      estimatedDuration: 60,
      unit: "minutos",
      active: true,
      requiresMaterials: false,
      skillLevel: "basic",
    });
    setIsDialogOpen(true);
  };

  /**
   * Abre o diálogo para editar um serviço existente
   */
  const handleEditService = (service: Service) => {
    setEditingService(service);
    form.reset({
      name: service.name,
      description: service.description || "",
      category: service.category,
      price: service.price,
      estimatedDuration: service.estimatedDuration,
      unit: service.unit,
      active: service.active,
      requiresMaterials: service.requiresMaterials,
      skillLevel: service.skillLevel,
    });
    setIsDialogOpen(true);
  };

  /**
   * Exclui um serviço
   */
  const handleDeleteService = async (service: Service) => {
    try {
      await deleteMutation.mutateAsync(service.id);
    } catch (error) {
      // Erro já tratado no hook de mutação
    }
  };

  /**
   * Submete o formulário de criação/edição de serviço
   */
  const onSubmit = async (data: ServiceFormData) => {
    try {
      if (editingService) {
        const updateData: UpdateServiceInput = {
          name: data.name,
          description: data.description || '',
          category: data.category,
          price: data.price,
          estimatedDuration: data.estimatedDuration,
          unit: data.unit,
          active: data.active,
          requiresMaterials: data.requiresMaterials,
          skillLevel: data.skillLevel
        };
        await updateMutation.mutateAsync({ id: editingService.id, data: updateData });
      } else {
        const createData: CreateServiceInput = {
          name: data.name,
          description: data.description || '',
          category: data.category,
          price: data.price,
          estimatedDuration: data.estimatedDuration,
          unit: data.unit,
          active: data.active,
          requiresMaterials: data.requiresMaterials,
          skillLevel: data.skillLevel
        };
        await createMutation.mutateAsync(createData);
      }
    } catch (error) {
      // Erro já tratado nos hooks de mutação
    }
  };

  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Serviços</h1>
          <p className="text-muted-foreground">
            Gerencie todos os serviços oferecidos
          </p>
        </div>
        <Button onClick={handleNewService}>
          <Plus className="mr-2 h-4 w-4" />
          Novo Serviço
        </Button>
      </div>

      {/* Stats Cards */}
      <ServicesStats services={services} />

      {/* Services Table */}
      <ServicesTable
        services={services}
        isLoading={isLoadingServices}
        error={servicesError}
        onNewService={handleNewService}
        onEditService={handleEditService}
        onDeleteService={handleDeleteService}
        onRefetch={refetch}
      />

      {/* Service Form Dialog */}
      <ServiceFormDialog
        isOpen={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        editingService={editingService}
        form={form}
        onSubmit={onSubmit}
        categories={categories}
        units={units}
        isLoadingCategories={isLoadingCategories}
        isLoadingUnits={isLoadingUnits}
        categoriesError={categoriesError}
        unitsError={unitsError}
        isSubmitting={isSubmitting}
      />
    </div>
  );
}