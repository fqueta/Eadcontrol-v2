import React, { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useProduct, useUpdateProduct } from '@/hooks/products';
import { useCategoriesList } from '@/hooks/categories';
import { ProductForm } from '@/components/products/ProductForm';
import { productSchema } from '@/components/products/ProductForm';
import { UpdateProductInput } from '@/types/products';
import { toast } from '@/hooks/use-toast';
import { FormActionBar } from '@/components/common/FormActionBar';

/**
 * Página dedicada para edição de produtos existentes
 * Oferece mais espaço e melhor experiência do usuário comparado ao modal
 */
export default function ProductEdit() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { data: product, isLoading, error } = useProduct(id!);
  const updateProductMutation = useUpdateProduct();
  const { data: categoriesResponse, isLoading: isLoadingCategories, error: categoriesError } = useCategoriesList();
  const categories = categoriesResponse?.data || [];
  
  // Mock units data - você pode criar um hook useUnits() se necessário
  const units = [
    { id: 1, name: 'Unidade', label: 'un', value: 'un' },
    { id: 2, name: 'Quilograma', label: 'kg', value: 'kg' },
    { id: 3, name: 'Litro', label: 'L', value: 'L' },
    { id: 4, name: 'Metro', label: 'm', value: 'm' },
    { id: 5, name: 'Peça', label: 'pç', value: 'pç' },
  ];
  const isLoadingUnits = false;
  const unitsError = null;

  const form = useForm<UpdateProductInput>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: '',
      description: '',
      category: '',
      salePrice: 0,
      costPrice: 0,
      stock: 0,
      unit: '',
      active: true,
      image: '',
      points: 0,
      rating: 0,
      reviews: 0,
      availability: 'available',
      terms: [],
      validUntil: undefined,
    },
  });

  /**
   * Preenche o formulário com os dados do produto quando carregado
   */
  useEffect(() => {
    if (product) {
      form.reset({
        name: product.name || '',
        description: product.description || '',
        category: product.category || '',
        salePrice: product.salePrice || 0,
        costPrice: product.costPrice || 0,
        stock: product.stock || 0,
        unit: product.unit || '',
        active: product.active ?? true,
        image: product.image || '',
        points: product.points || 0,
        rating: product.rating || 0,
        reviews: product.reviews || 0,
        availability: product.availability || 'available',
        terms: product.terms || [],
        validUntil: product.validUntil,
      });
    }
  }, [product, form]);

  /**
   * Função para lidar com o envio do formulário de edição
   */
  const onSubmit = async (data: UpdateProductInput) => {
    if (!id) return;
    
    try {
      await updateProductMutation.mutateAsync({
        id,
        data: {
          name: data.name,
          description: data.description,
          category: data.category,
          salePrice: data.salePrice,
          costPrice: data.costPrice,
          stock: data.stock,
          unit: data.unit,
          active: data.active,
          image: data.image,
          points: data.points,
          rating: data.rating,
          reviews: data.reviews,
          availability: data.availability,
          terms: data.terms,
          validUntil: data.validUntil,
        },
      });
      
      toast({
        title: 'Produto atualizado com sucesso!',
        description: 'As alterações foram salvas.',
      });
      
      navigate('/admin/products');
    } catch (error) {
      toast({
        title: 'Erro ao atualizar produto',
        description: 'Ocorreu um erro ao tentar atualizar o produto. Tente novamente.',
        variant: 'destructive',
      });
    }
  };

  /**
   * Função para cancelar e voltar à lista de produtos
   */
  const handleCancel = () => {
    navigate('/admin/products');
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="container mx-auto py-6">
        <div className="flex items-center justify-center h-64">
          <div className="flex items-center gap-2">
            <Loader2 className="h-6 w-6 animate-spin" />
            <span>Carregando produto...</span>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !product) {
    return (
      <div className="container mx-auto py-6">
        <div className="flex items-center gap-4 mb-6">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleCancel}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar
          </Button>
        </div>
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <h2 className="text-xl font-semibold mb-2">Produto não encontrado</h2>
              <p className="text-muted-foreground mb-4">
                O produto que você está tentando editar não foi encontrado.
              </p>
              <Button onClick={handleCancel}>Voltar à lista</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleCancel}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Editar Produto</h1>
          <p className="text-muted-foreground">
            Edite as informações do produto: {product.name}
          </p>
        </div>
      </div>

      {/* Form Card */}
      <Card>
        <CardHeader>
          <CardTitle>Informações do Produto</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <ProductForm 
              form={form}
              onSubmit={onSubmit}
              isSubmitting={updateProductMutation.isPending}
              categories={categories}
              units={units}
              isLoadingCategories={isLoadingCategories}
              isLoadingUnits={isLoadingUnits}
              categoriesError={categoriesError}
              unitsError={unitsError}
              onCancel={handleCancel}
              isEditing={true}
            />
            
            {/* Action Buttons (reusable component) */}
            <FormActionBar
              mode="edit"
              fixed={false}
              onCancel={handleCancel}
              isLoading={updateProductMutation.isPending}
              labels={{ saveEdit: 'Salvar Alterações' }}
            />
          </form>
        </CardContent>
      </Card>
    </div>
  );
}