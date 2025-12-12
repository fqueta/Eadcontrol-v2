import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import ServiceForm, { ServiceFormData, Category, Unit } from "./ServiceForm";
import { UseFormReturn } from "react-hook-form";
import type { Service } from "@/types/services";

interface ServiceFormDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  editingService: Service | null;
  form: UseFormReturn<ServiceFormData>;
  onSubmit: (data: ServiceFormData) => void;
  isSubmitting: boolean;
  categories: Category[];
  units: Unit[];
  isLoadingCategories: boolean;
  isLoadingUnits: boolean;
  categoriesError: any;
  unitsError: any;
}

/**
 * Componente de diálogo para criação e edição de serviços
 * Utiliza o ServiceForm dentro de um modal responsivo
 */
export default function ServiceFormDialog({
  isOpen,
  onOpenChange,
  editingService,
  form,
  onSubmit,
  isSubmitting,
  categories,
  units,
  isLoadingCategories,
  isLoadingUnits,
  categoriesError,
  unitsError
}: ServiceFormDialogProps) {
  const handleCancel = () => {
    onOpenChange(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {editingService ? "Editar Serviço" : "Novo Serviço"}
          </DialogTitle>
          <DialogDescription>
            {editingService 
              ? "Faça as alterações necessárias no serviço." 
              : "Preencha as informações do novo serviço."
            }
          </DialogDescription>
        </DialogHeader>

        <ServiceForm
          form={form}
          onSubmit={onSubmit}
          isSubmitting={isSubmitting}
          categories={categories}
          units={units}
          isLoadingCategories={isLoadingCategories}
          isLoadingUnits={isLoadingUnits}
          categoriesError={categoriesError}
          unitsError={unitsError}
          onCancel={handleCancel}
          isEditing={!!editingService}
        />
      </DialogContent>
    </Dialog>
  );
}