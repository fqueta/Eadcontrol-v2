import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { publicProductsService } from '@/services/publicProductsService';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, ShoppingBag, Loader2, AlertCircle } from 'lucide-react';
import { DynamicPrice } from '@/components/common/DynamicPrice';
import { CatalogCard } from '@/components/common/CatalogCard';

export default function ProductsGrid() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');

  const { data, isLoading, error } = useQuery({
    queryKey: ['public-products', 'list', search],
    queryFn: () => publicProductsService.listPublicProducts({ per_page: 20, search: search || undefined }),
  });

  const products = useMemo(() => {
    const d = data as any;
    return d?.data || d?.items || [];
  }, [data]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <AlertCircle className="h-12 w-12 text-destructive mb-4" />
        <p className="text-lg font-semibold text-slate-900 dark:text-white">Erro ao carregar produtos</p>
        <p className="text-sm text-muted-foreground mt-1">Tente novamente mais tarde.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar produtos..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 rounded-xl border-slate-200 dark:border-slate-800"
          />
        </div>
      </div>

      {products.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <ShoppingBag className="h-16 w-16 text-slate-300 dark:text-slate-700 mb-4" />
          <p className="text-lg font-semibold text-slate-900 dark:text-white">Nenhum produto encontrado</p>
          <p className="text-sm text-muted-foreground mt-1">Tente ajustar sua busca.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {products.map((product: any) => (
            <CatalogCard
              key={product.id}
              type="product"
              id={product.id}
              title={product.name || 'Produto sem título'}
              description={product.description}
              image={product.image}
              category={product.categoryData?.name}
              isFeatured={product.destaque === 's'}
              price={product.salePrice}
              installments={product.parcelas}
              installmentValue={product.valor_parcela}
              priceLabel="Valor"
              buttonText="Detalhes"
              linkUrl={`/produtos/${product.slug}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
