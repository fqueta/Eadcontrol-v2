import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ProductForm, ProductFormData, Category, Unit } from "./ProductForm";
import { UseFormReturn } from "react-hook-form";
import type { Product } from "@/types/products";

interface ProductFormDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  editingProduct: Product | null;
  form: UseFormReturn<ProductFormData>;
  onSubmit: (data: ProductFormData) => void;
  isSubmitting: boolean;
  categories: Category[];
  categoryData?: Category[];
  units: Unit[];
  unitData?: Unit[];
  isLoadingCategories: boolean;
  isLoadingUnits: boolean;
  categoriesError: any;
  unitsError: any;
}

export default function ProductFormDialog({
  isOpen,
  onOpenChange,
  editingProduct,
  form,
  onSubmit,
  isSubmitting,
  categories,
  units,
  isLoadingCategories,
  isLoadingUnits,
  categoriesError,
  unitsError
}: ProductFormDialogProps) {
  const handleCancel = () => {
    onOpenChange(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {editingProduct ? "Editar Produto" : "Novo Produto"}
          </DialogTitle>
          <DialogDescription>
            {editingProduct 
              ? "Faça as alterações necessárias no produto." 
              : "Preencha as informações do novo produto."
            }
          </DialogDescription>
        </DialogHeader>

        <ProductForm
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
          isEditing={!!editingProduct}
        />
      </DialogContent>
    </Dialog>
  );
}