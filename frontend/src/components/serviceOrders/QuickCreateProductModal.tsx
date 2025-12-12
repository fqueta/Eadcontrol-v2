import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import ProductFormDialog from "@/components/products/ProductFormDialog";
import { ProductFormData, productSchema } from "@/components/products/ProductForm";
import { useCreateProduct } from "@/hooks/products";
import { useProductCategories, useProductUnits } from "@/hooks/products";



interface QuickCreateProductModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onProductCreated: (product: any) => void;
}



/**
 * Modal para cadastro rápido de produto durante criação de ordem de serviço
 * Reutiliza o ProductFormDialog para manter consistência na interface
 */
export function QuickCreateProductModal({
  open,
  onOpenChange,
  onProductCreated,
}: QuickCreateProductModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Hooks para dados e mutações
  const { data: categoriesData, isLoading: isLoadingCategories, error: categoriesError } = useProductCategories();
  const { data: unitsData, isLoading: isLoadingUnits, error: unitsError } = useProductUnits();
  const createProductMutation = useCreateProduct();
  
  // Formulário com validação usando o mesmo schema do ProductForm
  const form = useForm<ProductFormData>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: "",
      description: "",
      category: "",
      salePrice: 0,
      costPrice: 0,
      stock: 0,
      unit: "",
      active: true,
      image: "",
    },
  });

  // Lista de categorias e unidades
  const categories = Array.isArray(categoriesData) ? categoriesData : [];
  const units = Array.isArray(unitsData) ? unitsData : [];

  /**
   * Submete o formulário de criação de produto
   */
  const handleSubmit = async (data: ProductFormData) => {
    try {
      setIsSubmitting(true);
      
      const result = await createProductMutation.mutateAsync({
        name: data.name,
        description: data.description || null,
        category: data.category,
        salePrice: data.salePrice,
        costPrice: data.costPrice,
        stock: data.stock,
        unit: data.unit,
        active: data.active,
        image: data.image,
        points: 0,
        rating: 0,
        reviews: 0,
        availability: "available" as const,
        terms: [],
        validUntil: undefined,
      });
      
      toast.success("Produto criado com sucesso!");
      
      // Notifica o componente pai sobre o novo produto
      onProductCreated(result);
      
      // Fecha o modal e reseta o formulário
      onOpenChange(false);
      form.reset();
    } catch (error) {
      console.error("Erro ao criar produto:", error);
      toast.error("Erro ao criar produto. Tente novamente.");
    } finally {
      setIsSubmitting(false);
    }
  };



  return (
    <ProductFormDialog
      isOpen={open}
      onOpenChange={onOpenChange}
      editingProduct={null}
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