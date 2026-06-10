import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { publicProductsService } from '@/services/publicProductsService';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, ShoppingBag, Loader2, AlertCircle } from 'lucide-react';

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
            <div
              key={product.id}
              onClick={() => navigate(`/produtos/${product.slug}`)}
              className="group cursor-pointer product-card-themed"
            >
              <div className="aspect-[4/3] bg-slate-100 dark:bg-slate-900 overflow-hidden">
                {product.image ? (
                  <img
                    src={product.image}
                    alt={product.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-300 dark:text-slate-700">
                    <ShoppingBag className="h-12 w-12" />
                  </div>
                )}
              </div>
              <div className="p-4">
                <h3 className="font-semibold text-sm text-slate-900 dark:text-white mb-1 line-clamp-2">
                  {product.name}
                </h3>
                {product.categoryData?.name && (
                  <span className="category-badge-themed">
                    {product.categoryData.name}
                  </span>
                )}
                <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 mb-3 min-h-[2rem]">
                  {product.description?.replace(/<[^>]*>/g, '') || 'Sem descrição'}
                </p>
                <div className="flex items-center justify-between">
                  <span className="text-lg font-bold text-primary">
                    {product.salePrice ? `R$ ${product.salePrice}` : 'Consultar'}
                  </span>
                  <Button size="sm" variant="outline" className="btn-themed-outline">
                    Ver detalhes
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
