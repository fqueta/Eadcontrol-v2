import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import ServiceFormDialog from "@/components/services/ServiceFormDialog";
import { ServiceFormData } from "@/components/services/ServiceForm";
import { useCreateService } from "@/hooks/services";
import { useServiceCategories, useServiceUnits } from "@/hooks/services";
import * as z from "zod";

// Schema de validação reutilizando o mesmo do ServiceForm
const serviceSchema = z.object({
  name: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
  description: z.string().optional(),
  category: z.string().min(1, "Categoria é obrigatória"),
  price: z.number().min(0.01, "Preço deve ser maior que 0"),
  estimatedDuration: z.number().min(1, "Duração estimada deve ser maior que 0"),
  unit: z.string().min(1, "Unidade é obrigatória"),
  active: z.boolean(),
  requiresMaterials: z.boolean(),
  skillLevel: z.enum(["basic", "intermediate", "advanced", "expert"], {
    required_error: "Nível de habilidade é obrigatório"
  }),
});

type QuickServiceFormData = ServiceFormData;

interface QuickCreateServiceModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onServiceCreated: (service: any) => void;
}

/**
 * Modal para cadastro rápido de serviço durante criação de ordem de serviço
 * Reutiliza o ServiceFormDialog para manter consistência na interface
 */
export function QuickCreateServiceModal({
  open,
  onOpenChange,
  onServiceCreated,
}: QuickCreateServiceModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Hooks para dados e mutações
  const { data: categoriesData, isLoading: isLoadingCategories, error: categoriesError } = useServiceCategories();
  const { data: unitsData, isLoading: isLoadingUnits, error: unitsError } = useServiceUnits();
  const createServiceMutation = useCreateService();
  
  // Formulário com validação usando o mesmo schema do ServiceForm
  const form = useForm<QuickServiceFormData>({
    resolver: zodResolver(serviceSchema),
    defaultValues: {
      name: "",
      description: "",
      category: "",
      price: 0,
      estimatedDuration: 60, // 1 hora por padrão
      unit: "",
      active: true,
      requiresMaterials: false,
      skillLevel: "basic",
    },
  });
  const categoryAny = categoriesData as any;
  const unitAny = unitsData as any;
  // console.log('unitsData:', unitsData);
  // Lista de categorias e unidades
  const categories = Array.isArray(categoryAny) ? categoryAny : [];
  const units = Array.isArray(unitAny?.data) ? unitAny.data : [];
  // console.log('categories:', categories);
  
  /**
   * Submete o formulário de criação de serviço
   */
  const handleSubmit = async (data: QuickServiceFormData) => {
    try {
      setIsSubmitting(true);
      
      const result = await createServiceMutation.mutateAsync({
        name: data.name,
        description: data.description || null,
        category: data.category,
        price: data.price,
        estimatedDuration: data.estimatedDuration,
        unit: data.unit,
        active: data.active,
        requiresMaterials: data.requiresMaterials,
        skillLevel: data.skillLevel,
      });
      
      toast.success("Serviço criado com sucesso!");
      
      // Notifica o componente pai sobre o novo serviço
      onServiceCreated(result);
      
      // Fecha o modal e reseta o formulário
      onOpenChange(false);
      form.reset();
    } catch (error) {
      console.error("Erro ao criar serviço:", error);
      toast.error("Erro ao criar serviço. Tente novamente.");
    } finally {
      setIsSubmitting(false);
    }
  };

  /**
   * Cancela a criação e fecha o modal
   */
  const handleCancel = () => {
    onOpenChange(false);
    form.reset();
  };

  return (
    <ServiceFormDialog
      isOpen={open}
      onOpenChange={onOpenChange}
      editingService={null}
      form={form}
      onSubmit={handleSubmit}
      isSubmitting={isSubmitting}
      categories={categories}
      units={units}
      isLoadingCategories={isLoadingCategories}
      isLoadingUnits={isLoadingUnits}
      categoriesError={categoriesError}
      unitsError={unitsError}
    />
  );
}