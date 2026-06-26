import { useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import InclusiveSiteLayout from '@/components/layout/InclusiveSiteLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { publicProductsService } from '@/services/publicProductsService';
import { ArrowLeft, ShoppingBag, Loader2, AlertCircle, Edit } from 'lucide-react';
import { DynamicPrice } from '@/components/common/DynamicPrice';
import { useAuth } from '@/contexts/AuthContext';

export default function ProductPublicDetails() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const permissionId = Number((user as any)?.permission_id ?? 999);

  const { data: product, isLoading, error } = useQuery({
    queryKey: ['public-product', slug],
    queryFn: () => (slug ? publicProductsService.getProductBySlug(slug) : null),
    enabled: !!slug,
  });

  if (isLoading) {
    return (
      <InclusiveSiteLayout>
        <div className="flex items-center justify-center py-32">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </InclusiveSiteLayout>
    );
  }

  if (error || !product) {
    return (
      <InclusiveSiteLayout>
        <div className="container mx-auto px-4 py-16">
          <Button variant="ghost" onClick={() => navigate('/produtos')} className="mb-6 rounded-lg">
            <ArrowLeft className="h-4 w-4 mr-2" /> Voltar
          </Button>
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <AlertCircle className="h-16 w-16 text-destructive mb-4" />
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Produto não encontrado</h1>
            <p className="text-muted-foreground mb-6">O produto que você procura não está disponível.</p>
            <Button onClick={() => navigate('/produtos')} className="btn-themed-primary">Ver todos os produtos</Button>
          </div>
        </div>
      </InclusiveSiteLayout>
    );
  }

  return (
    <InclusiveSiteLayout>
      <div className="container mx-auto px-4 py-8">
        <Button variant="ghost" onClick={() => navigate('/produtos')} className="mb-6 rounded-lg">
          <ArrowLeft className="h-4 w-4 mr-2" /> Voltar ao catálogo
        </Button>

        <div className="grid md:grid-cols-2 gap-8">
          <div className="product-image-themed">
            {product.image ? (
              <img
                src={product.image}
                alt={product.name}
                className="w-full h-full object-contain aspect-square"
                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
              />
            ) : (
              <div className="aspect-square flex items-center justify-center text-slate-300 dark:text-slate-700">
                <ShoppingBag className="h-24 w-24" />
              </div>
            )}
          </div>

          <div className="space-y-6">
            <div>
              <div className="flex items-start justify-between gap-4">
                <div>
                  {product.categoryData?.name && (
                    <span className="category-badge-themed px-3 py-1 mb-3">
                      {product.categoryData.name}
                    </span>
                  )}
                  <h1 className="text-3xl md:text-4xl font-black tracking-tighter text-slate-900 dark:text-white">
                    {product.name}
                  </h1>
                </div>
                {permissionId < 3 && (
                  <Button
                    variant="outline"
                    onClick={() => navigate(`/admin/products/${product.id}/edit`)}
                    className="shrink-0 flex items-center gap-1.5 rounded-lg border-slate-200 text-xs font-semibold"
                    title="Editar produto"
                  >
                    <Edit className="h-3.5 w-3.5" />
                    Editar
                  </Button>
                )}
              </div>
            </div>

            <Separator />

            <div>
              <div className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-1">Preço</div>
              <div className="mt-1 mb-2">
                <DynamicPrice 
                  price={product.salePrice} 
                  installments={(product as any).parcelas} 
                  installmentValue={(product as any).valor_parcela} 
                  size="lg" 
                />
              </div>
              {product.stock !== null && product.stock !== undefined && (
                <p className="text-sm text-muted-foreground mt-1">
                  {product.stock > 0 ? `${product.stock} em estoque` : 'Indisponível'}
                </p>
              )}
            </div>

            <Separator />

            {product.description && (
              <div>
                <h3 className="text-sm font-bold text-foreground/80 mb-2">Descrição</h3>
                <div
                  className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed prose prose-sm max-w-none whitespace-pre-wrap"
                  dangerouslySetInnerHTML={{ __html: product.description }}
                />
              </div>
            )}

            {product.unitData?.label && (
              <p className="text-xs text-muted-foreground">
                Unidade: <span className="font-medium">{product.unitData.label}</span>
              </p>
            )}
          </div>
        </div>
      </div>
    </InclusiveSiteLayout>
  );
}
