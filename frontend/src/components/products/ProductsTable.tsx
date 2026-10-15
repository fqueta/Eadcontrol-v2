import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { 
  Plus, 
  Search, 
  MoreHorizontal, 
  Edit, 
  Trash2, 
  Eye,
  Package,
  AlertTriangle,
  Loader2
} from "lucide-react";
import type { Product } from "@/types/products";
import { useUpdateProduct } from "@/hooks/products";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { Switch } from "@/components/ui/switch";
import { useInfiniteScroll } from "@/components/common/InfiniteScroll";

interface ProductsTableProps {
  products: Product[];
  isLoading: boolean;
  error: any;
  onNewProduct: () => void;
  onEditProduct: (product: Product) => void;
  onDeleteProduct: (product: Product) => void;
  onRefetch: () => void;
  // Propriedades para Scroll Infinito
  hasNextPage?: boolean;
  isFetchingNextPage?: boolean;
  onLoadMore?: () => void;
  totalProducts?: number;
  searchTerm?: string;
  onSearchChange?: (term: string) => void;
}

export default function ProductsTable({
  products,
  isLoading,
  error,
  onNewProduct,
  onEditProduct,
  onDeleteProduct,
  onRefetch,
  hasNextPage = false,
  isFetchingNextPage = false,
  onLoadMore,
  totalProducts,
  searchTerm: externalSearchTerm,
  onSearchChange: externalOnSearchChange,
}: ProductsTableProps) {
  const [localSearchTerm, setLocalSearchTerm] = useState("");
  const searchTerm = externalSearchTerm !== undefined ? externalSearchTerm : localSearchTerm;
  const handleSearchChange = (value: string) => {
    if (externalOnSearchChange) {
      externalOnSearchChange(value);
    } else {
      setLocalSearchTerm(value);
    }
  };

  const { sentinelRef } = useInfiniteScroll({
    hasMore: hasNextPage,
    isLoading: isFetchingNextPage,
    onLoadMore: () => {
      if (onLoadMore && hasNextPage && !isFetchingNextPage) {
        onLoadMore();
      }
    },
    rootMargin: '250px',
  });

  const navigate = useNavigate();
  const link_admin = '/admin';

  const updateProductMutation = useUpdateProduct();
  const { user } = useAuth();
  /**
   * Determina se o usuário pode editar o estoque.
   * Rule: only users with permission_id <= 5.
   */
  const canEditStock = Number(user?.permission_id ?? 9999) <= 5;

  /**
   * Estado para controlar edição inline do estoque na tabela.
   * - editingStockId: linha atualmente em edição.
   * - stockDraft: valor temporário do estoque para salvar.
   */
  const [editingStockId, setEditingStockId] = useState<string | null>(null);
  const [stockDraft, setStockDraft] = useState<number>(0);



  /**
   * Inicia edição de estoque para um produto da listagem.
   * @param product Produto alvo para edição
   */
  const handleStartEditStock = (product: Product) => {
    setEditingStockId(product.id);
    setStockDraft(Number(product.stock) || 0);
  };

  /**
   * Atualiza o valor digitado do estoque (com piso em 0).
   * @param value Novo valor numérico
   */
  const handleChangeStock = (value: number) => {
    setStockDraft(Math.max(0, Number.isNaN(value) ? 0 : value));
  };

  /**
   * Ajusta o estoque incrementalmente (por exemplo, +1 ou -1).
   * @param delta Incremento a aplicar
   */
  const handleAdjustStock = (delta: number) => {
    setStockDraft((prev) => Math.max(0, (Number(prev) || 0) + delta));
  };

  /**
   * Salva o novo estoque via API e atualiza a listagem.
   * @param productId ID do produto que está sendo editado
   */
  const handleSaveStock = async (productId: string) => {
    try {
      await updateProductMutation.mutateAsync({
        id: productId,
        data: { stock: Math.max(0, Number(stockDraft) || 0) },
      });
      toast({ title: 'Estoque atualizado', description: 'Alteração salva com sucesso.' });
      setEditingStockId(null);
      onRefetch();
    } catch (err: any) {
      toast({ title: 'Erro ao atualizar estoque', description: err?.message || 'Tente novamente mais tarde.', variant: 'destructive' });
    }
  };

  /**
   * Alterna a marcação de destaque do produto.
   * @param product Produto a ser atualizado
   */
  const handleToggleDestaque = async (product: Product) => {
    try {
      const newDestaque = product.destaque === 's' ? 'n' : 's';
      await updateProductMutation.mutateAsync({
        id: product.id,
        data: { destaque: newDestaque },
      });
      toast({ title: 'Destaque atualizado', description: `Produto "${product.name}" ${newDestaque === 's' ? 'marcado' : 'desmarcado'} como destaque.` });
      onRefetch();
    } catch (err: any) {
      toast({ title: 'Erro ao atualizar destaque', description: err?.message || 'Tente novamente.', variant: 'destructive' });
    }
  };

  /**
   * Navega para a página de visualização do produto
   */
  const handleViewProduct = (product: Product) => {
    navigate(link_admin + `/products/${product.id}`);
  };

  const filteredProducts = externalOnSearchChange
    ? products
    : products.filter(product =>
        product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (product.description || '').toLowerCase().includes(searchTerm.toLowerCase())
      );

  return (
    <Card className="border-none shadow-xl bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm overflow-hidden">
      <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              Produtos cadastrados
              {totalProducts !== undefined ? (
                <Badge variant="secondary" className="rounded-full px-2 font-mono text-[10px]">
                  {products.length} de {totalProducts}
                </Badge>
              ) : filteredProducts.length > 0 ? (
                <Badge variant="secondary" className="rounded-full px-2 font-mono text-[10px]">
                  {filteredProducts.length}
                </Badge>
              ) : null}
            </CardTitle>
            <CardDescription className="mt-1">
              Visualize e gerencie todos os produtos cadastrados
            </CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative group">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground transition-colors group-focus-within:text-primary" />
              <Input
                placeholder="Buscar produtos..."
                value={searchTerm}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="pl-9 w-full md:w-[240px] lg:w-[320px] bg-white/80 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 transition-all"
              />
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="relative overflow-x-auto">
          <Table>
            <TableHeader className="bg-slate-50/50 dark:bg-slate-800/50">
              <TableRow>
                <TableHead className="font-bold text-xs uppercase tracking-wider text-slate-500 pl-6">Imagem</TableHead>
                <TableHead className="font-bold text-xs uppercase tracking-wider text-slate-500">Produto</TableHead>
                <TableHead className="font-bold text-xs uppercase tracking-wider text-slate-500">Categoria</TableHead>
                <TableHead className="font-bold text-xs uppercase tracking-wider text-slate-500">Preço de Venda</TableHead>
                <TableHead className="font-bold text-xs uppercase tracking-wider text-slate-500">Pontos</TableHead>
                <TableHead className="font-bold text-xs uppercase tracking-wider text-slate-500">Estoque</TableHead>
                <TableHead className="font-bold text-xs uppercase tracking-wider text-slate-500">Status</TableHead>
                <TableHead className="font-bold text-xs uppercase tracking-wider text-slate-500">Destaque</TableHead>
                <TableHead className="font-bold text-xs uppercase tracking-wider text-slate-500 text-right pr-6">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8">
                    <div className="flex items-center justify-center space-x-2">
                      <Package className="h-4 w-4 animate-spin" />
                      <span>Carregando produtos...</span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : error ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8">
                    <div className="flex flex-col items-center space-y-2 text-destructive">
                      <AlertTriangle className="h-8 w-8" />
                      <div>
                        <p className="font-medium">Erro ao carregar produtos</p>
                        <p className="text-sm text-muted-foreground">
                          {error?.message || 'Não foi possível conectar com o servidor'}
                        </p>
                      </div>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={onRefetch}
                        className="mt-2"
                      >
                        Tentar novamente
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ) : !products || products.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8">
                    <div className="flex flex-col items-center space-y-2 text-muted-foreground">
                      <Package className="h-8 w-8" />
                      <div>
                        <p className="font-medium">Nenhum produto cadastrado</p>
                        <p className="text-sm">Comece criando seu primeiro produto</p>
                      </div>
                      <Button 
                        onClick={onNewProduct}
                        size="sm"
                        className="mt-2"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Criar produto
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ) : filteredProducts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8">
                    <div className="flex flex-col items-center space-y-2 text-muted-foreground">
                      <Search className="h-8 w-8" />
                      <div>
                        <p className="font-medium">Nenhum produto encontrado</p>
                        <p className="text-sm">Tente ajustar os filtros de busca</p>
                      </div>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredProducts.map((product) => (
                  <TableRow key={product.id} onDoubleClick={() => onEditProduct(product)} className="cursor-pointer">
                    <TableCell className="pl-6">
                      <div className="w-16 h-16 rounded-md overflow-hidden bg-muted flex items-center justify-center">
                        {product.image ? (
                          <img 
                            src={product.image} 
                            alt={product.name}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none';
                              const next = e.currentTarget.nextElementSibling as HTMLElement | null;
                              if (next) next.style.display = 'flex';
                            }}
                          />
                        ) : null}
                        <div className={`text-xs text-muted-foreground ${product.image ? 'hidden' : 'flex'} items-center justify-center w-full h-full`}>
                          Sem imagem
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">{product.name}</div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{(product as any).categoryData?.name || product.category}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm font-medium">
                        R$ {product.salePrice?.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0,00'}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm font-medium">
                        {product.points?.toLocaleString('pt-BR') || '0'}
                      </div>
                    </TableCell>
                    <TableCell>
                      {canEditStock ? (
                        editingStockId === product.id ? (
                          <div className="flex items-center gap-2">
                            <Input
                              type="number"
                              min={0}
                              value={stockDraft}
                              onChange={(e) => handleChangeStock(Number(e.target.value))}
                              className="w-20 h-8"
                            />
                            <Button variant="outline" size="sm" onClick={() => handleAdjustStock(-1)}>-</Button>
                            <Button variant="outline" size="sm" onClick={() => handleAdjustStock(1)}>+</Button>
                            <Button size="sm" onClick={() => handleSaveStock(product.id)} disabled={updateProductMutation.isPending}>
                              {updateProductMutation.isPending && (<Loader2 className="mr-2 h-4 w-4 animate-spin" />)}
                              Salvar
                            </Button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <div className="text-sm font-medium">
                              {product.stock?.toLocaleString('pt-BR') || '0'} {product.unit || ''}
                            </div>
                            <Button variant="outline" size="sm" onClick={() => handleStartEditStock(product)}>Editar</Button>
                          </div>
                        )
                      ) : (
                        <div className="text-sm font-medium">
                          {product.stock?.toLocaleString('pt-BR') || '0'} {product.unit || ''}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={product.active ? "default" : "destructive"}>
                        {product.active ? "Ativo" : "Inativo"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Switch
                        checked={product.destaque === 's'}
                        onCheckedChange={() => handleToggleDestaque(product)}
                        disabled={updateProductMutation.isPending}
                      />
                    </TableCell>
                    <TableCell className="text-right pr-6">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <span className="sr-only">Abrir menu</span>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Ações</DropdownMenuLabel>
                          <DropdownMenuItem onClick={() => handleViewProduct(product)}>
                            <Eye className="mr-2 h-4 w-4" />
                            Visualizar
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => onEditProduct(product)}>
                            <Edit className="mr-2 h-4 w-4" />
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem 
                            className="text-destructive"
                            onClick={() => onDeleteProduct(product)}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Excluir
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}

              {/* Sentinela de Scroll Infinito e indicador de carregamento */}
              {hasNextPage && (
                <TableRow ref={sentinelRef} className="hover:bg-transparent">
                  <TableCell colSpan={9} className="py-6 text-center bg-slate-50/40 dark:bg-slate-800/30">
                    <div className="flex flex-col items-center justify-center gap-2">
                      {isFetchingNextPage ? (
                        <div className="flex items-center gap-2 text-sm text-primary font-semibold animate-pulse">
                          <Loader2 className="h-4 w-4 animate-spin text-primary" />
                          <span>Carregando mais produtos...</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-3">
                          <span className="text-xs text-muted-foreground">
                            Role a página para carregar mais produtos automaticamente
                          </span>
                          {onLoadMore && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => onLoadMore()}
                              className="h-7 text-xs font-semibold hover:bg-primary hover:text-white transition-colors"
                            >
                              Carregar mais
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              )}

              {/* Mensagem quando todos os produtos foram carregados */}
              {!hasNextPage && products.length > 0 && !isLoading && (
                <TableRow className="hover:bg-transparent">
                  <TableCell colSpan={9} className="py-4 text-center text-xs font-medium text-muted-foreground/80 bg-slate-50/20 dark:bg-slate-800/20">
                    ✓ Todos os {totalProducts || products.length} produtos foram carregados
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        {/* Barra de Status e Contagem */}
        {products.length > 0 && (
          <div className="px-6 py-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              <span>Exibindo <strong>{products.length}</strong> de <strong>{totalProducts || products.length}</strong> produtos</span>
              {isFetchingNextPage && (
                <span className="inline-flex items-center gap-1 text-primary font-medium">
                  <Loader2 className="h-3 w-3 animate-spin" /> Carregando...
                </span>
              )}
            </div>
            {hasNextPage && onLoadMore && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onLoadMore()}
                disabled={isFetchingNextPage}
                className="h-7 text-xs font-bold text-primary hover:text-primary hover:bg-primary/10"
              >
                {isFetchingNextPage ? 'Buscando...' : 'Carregar mais (+20)'}
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}