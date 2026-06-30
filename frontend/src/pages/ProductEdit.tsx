import React, { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeft, Loader2, Eye, ExternalLink, Save, CheckCircle2, Copy, Plus } from 'lucide-react';
import { currencyApplyMask, currencyRemoveMaskToNumber } from '@/lib/masks/currency';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useProduct, useUpdateProduct } from '@/hooks/products';
import { useCategoriesList } from '@/hooks/categories';
import { ProductForm, ProductFormData } from '@/components/products/ProductForm';
import { productSchema } from '@/components/products/ProductForm';
import { toast } from '@/hooks/use-toast';

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
  
  const [saving, setSaving] = React.useState<'stay' | 'exit' | null>(null);

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

  const form = useForm<ProductFormData>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: '',
      description: '',
      category: '',
      salePrice: '0,00',
      costPrice: '0,00',
      stock: 0,
      unit: 'un',
      active: true,
      image: '',
      rating: 0,
      reviews: 0,
      availability: 'available',
      validUntil: undefined,
      destaque: 'n',
      parcelas: '1',
      valor_parcela: '0,00',
    },
  });

  /**
   * Preenche o formulário com os dados do produto quando carregado
   */
  const toMaskedCurrency = (v: any) => {
    if (v === null || v === undefined || v === '') return '';
    const num = Number(v);
    if (!isNaN(num)) return currencyApplyMask(String(Math.round(num * 100)), 'pt-BR', 'BRL');
    return String(v);
  };

  useEffect(() => {
    if (product) {
      form.reset({
        name: product.name || '',
        description: product.description || '',
        category: product.category || '',
        salePrice: toMaskedCurrency(product.salePrice),
        costPrice: toMaskedCurrency(product.costPrice),
        stock: Number(product.stock) || 0,
        unit: product.unit || '',
        active: product.active ?? true,
        image: product.image || '',
        rating: Number(product.rating) || 0,
        reviews: Number(product.reviews) || 0,
        availability: product.availability || 'available',
        validUntil: product.validUntil,
        destaque: product.destaque || 'n',
        parcelas: String((product as any).parcelas || '1'),
        valor_parcela: toMaskedCurrency((product as any).valor_parcela),
      });
    }
  }, [product, form]);

  /**
   * Função para lidar com o envio do formulário de edição
   */
  const onSubmit = async (data: ProductFormData, exitAfterSave = true) => {
    if (!id) return;
    
    setSaving(exitAfterSave ? 'exit' : 'stay');
    try {
      await updateProductMutation.mutateAsync({
        id,
        data: {
          name: data.name,
          description: data.description,
          category: data.category,
          salePrice: currencyRemoveMaskToNumber(data.salePrice),
          costPrice: currencyRemoveMaskToNumber(data.costPrice),
          stock: data.stock,
          unit: data.unit,
          active: data.active,
          image: data.image,
          points: 0,
          rating: data.rating,
          reviews: data.reviews,
          availability: data.availability,
          terms: [],
          validUntil: data.validUntil,
          destaque: data.destaque as 's' | 'n',
          parcelas: data.parcelas ? Number(data.parcelas) : 1,
          valor_parcela: data.valor_parcela ? currencyRemoveMaskToNumber(data.valor_parcela) : 0,
        },
      });
      
      toast({
        title: 'Produto atualizado com sucesso!',
        description: 'As alterações foram salvas.',
      });
      
      if (exitAfterSave) {
        navigate('/admin/products');
      }
    } catch (error) {
      toast({
        title: 'Erro ao atualizar produto',
        description: 'Ocorreu um erro ao tentar atualizar o produto. Tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setSaving(null);
    }
  };

  /**
   * Função para cancelar e voltar à lista de produtos
   */
  const handleCancel = () => {
    navigate('/admin/products');
  };

  const handleSaveAndStay = () => {
    form.handleSubmit((data) => onSubmit(data, false))();
  };

  const handleSaveAndExit = () => {
    form.handleSubmit((data) => onSubmit(data, true))();
  };

  const handlePreview = () => {
    const slug = product?.slug;
    if (slug) {
      window.open(`/produtos/${slug}`, '_blank', 'noreferrer');
    }
  };

  const copyText = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: 'Link copiado!',
      description: 'O link foi copiado para a área de transferência.',
    });
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
    <div className="container mx-auto py-6 space-y-6 pb-24 animate-in fade-in duration-500">
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
          <ProductForm 
            form={form}
            onSubmit={(data) => onSubmit(data, true)}
            isSubmitting={updateProductMutation.isPending}
            categories={categories}
            units={units}
            isLoadingCategories={isLoadingCategories}
            isLoadingUnits={isLoadingUnits}
            categoriesError={categoriesError}
            unitsError={unitsError}
            onCancel={handleCancel}
            isEditing={true}
            hideActions={true}
          />
        </CardContent>
      </Card>

      {/* Barra fixa de ações no rodapé (Estilo SaaS Premium) */}
      <div className="fixed bottom-0 left-0 right-0 z-[60] border-t border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-950/70 backdrop-blur-xl shadow-[0_-8px_40px_rgba(0,0,0,0.08)]">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Button
              type="button"
              variant="ghost"
              onClick={handleCancel}
              className="text-muted-foreground hover:text-foreground font-bold rounded-xl transition-all h-12 px-6 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              Descartar
            </Button>
            <div className="h-6 w-px bg-slate-200 dark:bg-slate-800 mx-2 hidden md:block" />
            <div className="hidden lg:flex items-center gap-4">
              <Button
                type="button"
                variant="outline"
                onClick={handlePreview}
                disabled={!product?.slug}
                className="border-slate-200 dark:border-slate-800 font-bold rounded-xl h-12 px-6 shadow-sm hover:bg-slate-50 dark:hover:bg-slate-900 transition-all"
              >
                <Eye className="h-4 w-4 mr-2" /> Ver Preview
              </Button>
              {(() => {
                const slug = product?.slug;
                if (!slug) return null;
                const href = `/produtos/${slug}`;
                const origin = typeof window !== 'undefined' ? window.location.origin : '';
                const absolute = `${origin}${href}`;
                return (
                  <div className="flex items-center gap-2 group bg-slate-100/50 dark:bg-slate-800/50 p-1.5 rounded-xl pr-3 border border-slate-200/50 dark:border-slate-700/50">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-9 w-9 rounded-lg bg-white dark:bg-slate-900 shadow-sm text-primary/60 hover:text-primary transition-all"
                      onClick={() => copyText(absolute)}
                      title="Copiar link da página de detalhes"
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                    <a
                      href={href}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs font-black text-muted-foreground hover:text-primary transition-colors flex items-center gap-2"
                    >
                      PÁGINA DO PRODUTO <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                );
              })()}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button
              type="button"
              variant="ghost"
              className="text-primary hover:bg-primary/5 font-bold hidden sm:flex"
              onClick={() => navigate('/admin/products/create')}
            >
              <Plus className="h-4 w-4 mr-2" />Novo cadastro
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={handleSaveAndStay}
              disabled={Boolean(saving)}
              className="border-muted-foreground/20 hover:bg-muted font-bold min-w-[150px] hidden md:flex"
            >
              {saving === 'stay' ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Salvando...</>
              ) : (
                <><Save className="h-4 w-4 mr-2" />Salvar</>
              )}
            </Button>
            <Button
              type="button"
              variant="default"
              onClick={handleSaveAndExit}
              disabled={Boolean(saving)}
              className="bg-primary hover:bg-primary/90 text-primary-foreground font-black shadow-lg shadow-primary/20 min-w-[180px]"
            >
              {saving === 'exit' ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Finalizando...</>
              ) : (
                <><CheckCircle2 className="h-4 w-4 mr-2" />Salvar e Finalizar</>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}