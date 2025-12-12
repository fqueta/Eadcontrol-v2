import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Package, TrendingUp, AlertTriangle } from "lucide-react";
import type { Product } from "@/types/products";

interface ProductsStatsProps {
  products: Product[];
}

export function ProductsStats({ products }: ProductsStatsProps) {
  const totalProducts = products.length;
  const availableProducts = products.filter(p => p.availability === 'available').length;
  const totalPointsValue = products.reduce((sum, product) => {
    const points = Number(product.points);
    return sum + (isNaN(points) ? 0 : points);
  }, 0);
  const limitedProducts = products.filter(p => p.availability === 'limited').length;
  
  // Calcula a avaliação média apenas se houver produtos
  const averageRating = products.length > 0 
    ? Math.round((products.reduce((sum, p) => {
        const rating = Number(p.rating);
        return sum + (isNaN(rating) ? 0 : rating);
      }, 0) / products.length) * 10) / 10
    : 0;

  return (
    <div className="grid gap-4 md:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total de Produtos</CardTitle>
          <Package className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{totalProducts}</div>
          <p className="text-xs text-muted-foreground">
            {availableProducts} disponíveis
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total de Pontos</CardTitle>
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {isNaN(totalPointsValue) ? '0' : totalPointsValue.toLocaleString('pt-BR')} pts
          </div>
          <p className="text-xs text-muted-foreground">
            Valor total em pontos
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Disponibilidade Limitada</CardTitle>
          <AlertTriangle className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{limitedProducts}</div>
          <p className="text-xs text-muted-foreground">
            Produtos com estoque limitado
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Avaliação Média</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {averageRating}/5
          </div>
          <p className="text-xs text-muted-foreground">
            Classificação dos produtos
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

export default ProductsStats;