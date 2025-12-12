import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { useProductsList, useCreateProduct, useUpdateProduct, useDeleteProduct, useProductCategories, useProductUnits } from "@/hooks/products";
import type { Product, CreateProductInput, UpdateProductInput } from "@/types/products";
import { Plus, Edit } from "lucide-react";
import ProductsStats from "@/components/products/ProductsStats";
import ProductsTable from "@/components/products/ProductsTable";
import ProductFormDialog from "@/components/products/ProductFormDialog";
import { ProductFormData, productSchema } from "@/components/products/ProductForm";



export default function Products() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  // Hooks para produtos
  const { data: productsData, isLoading: isLoadingProducts, error: productsError, refetch } = useProductsList();
  const createMutation = useCreateProduct({
    onSuccess: () => {
      toast.success('Produto criado com sucesso!');
      setIsDialogOpen(false);
      setEditingProduct(null);
      refetch();
      form.reset();
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Erro ao criar produto');
    }
  });
  const updateMutation = useUpdateProduct({
    onSuccess: () => {
      toast.success('Produto atualizado com sucesso!');
      setIsDialogOpen(false);
      setEditingProduct(null);
      refetch();
      form.reset();
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Erro ao atualizar produto');
    }
  });
  const deleteMutation = useDeleteProduct({
    onSuccess: () => {
      toast.success('Produto excluído com sucesso!');
      refetch();
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Erro ao excluir produto');
    }
  });

  // Hooks para categorias e unidades
  const { data: categories = [], isLoading: isLoadingCategories, error: categoriesError } = useProductCategories();
  const { data: units = [], isLoading: isLoadingUnits, error: unitsError } = useProductUnits();

  // Extrai os produtos da resposta paginada
  const products = Array.isArray(productsData) ? productsData : productsData?.data || [];

  const form = useForm<ProductFormData>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: "",
      description: "",
      category: "",
      salePrice: 0,
      costPrice: 0,
      stock: 0,
      unit: "Unidade",
      active: true,
      image: "",
      points: 0,
      rating: 0,
      reviews: 0,
      availability: "available" as const,
      terms: [],
      validUntil: "",
    },
  });

  const handleNewProduct = () => {
    navigate('/admin/products/create');
  };

  const handleEditProduct = (product: Product) => {
    navigate(`/admin/products/${product.id}/edit`);
  };

  const handleDeleteProduct = async (product: Product) => {
    try {
      await deleteMutation.mutateAsync(product.id);
    } catch (error) {
      // Erro já tratado no hook de mutação
    }
  };

  const onSubmit = async (data: ProductFormData) => {
    try {
      if (editingProduct) {
        const updateData: UpdateProductInput = {
          name: data.name,
          description: data.description || '',
          category: data.category,
          salePrice: data.salePrice,
          costPrice: data.costPrice,
          stock: data.stock,
          unit: data.unit,
          active: data.active,
          image: data.image || '',
          points: data.points,
          rating: data.rating || 0,
          reviews: data.reviews || 0,
          availability: data.availability,
          terms: data.terms,
          validUntil: data.validUntil || ''
        };
        await updateMutation.mutateAsync({ id: editingProduct.id, data: updateData });
      } else {
        const createData: CreateProductInput = {
          name: data.name,
          description: data.description || '',
          category: data.category,
          salePrice: data.salePrice,
          costPrice: data.costPrice,
          stock: data.stock,
          unit: data.unit,
          active: data.active,
          image: data.image || '',
          points: data.points,
          rating: data.rating || 0,
          reviews: data.reviews || 0,
          availability: data.availability,
          terms: data.terms,
          validUntil: data.validUntil || ''
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
          <h1 className="text-3xl font-bold tracking-tight">Produtos</h1>
          <p className="text-muted-foreground">
            Gerencie todos os produtos do estoque
          </p>
        </div>
        {/* <Button onClick={handleNewProduct}>
          <Plus className="mr-2 h-4 w-4" />
          Novo Produto
        </Button> */}
      </div>

      {/* Stats Cards */}
      <ProductsStats products={products} />

      {/* Products Table */}
      <ProductsTable
        products={products}
        isLoading={isLoadingProducts}
        error={productsError}
        onNewProduct={handleNewProduct}
        onEditProduct={handleEditProduct}
        onDeleteProduct={handleDeleteProduct}
        onRefetch={refetch}
      />

      {/* Product Form Dialog */}
      <ProductFormDialog
        isOpen={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        editingProduct={editingProduct}
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