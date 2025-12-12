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

interface ProductsTableProps {
  products: Product[];
  isLoading: boolean;
  error: any;
  onNewProduct: () => void;
  onEditProduct: (product: Product) => void;
  onDeleteProduct: (product: Product) => void;
  onRefetch: () => void;
}

export default function ProductsTable({
  products,
  isLoading,
  error,
  onNewProduct,
  onEditProduct,
  onDeleteProduct,
  onRefetch
}: ProductsTableProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const navigate = useNavigate();
  const link_admin = '/admin';

  const updateProductMutation = useUpdateProduct();
  const { user } = useAuth();
  /**
   * Determina se o usuário pode editar o estoque.
   * Rule: only users with permission_id <= 5.
   */
  const canEditStock = (user?.permission_id ?? Infinity) <= 5;

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
   * Navega para a página de visualização do produto
   */
  const handleViewProduct = (product: Product) => {
    navigate(link_admin + `/products/${product.id}`);
  };

  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (product.description || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Lista de Produtos</CardTitle>
        <CardDescription>
          Visualize e gerencie todos os produtos cadastrados
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center space-x-2 mb-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar produtos..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8"
            />
          </div>
        </div>

        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Imagem</TableHead>
                <TableHead>Produto</TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead>Preço de Venda</TableHead>
                <TableHead>Pontos</TableHead>
                <TableHead>Estoque</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8">
                    <div className="flex items-center justify-center space-x-2">
                      <Package className="h-4 w-4 animate-spin" />
                      <span>Carregando produtos...</span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : error ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8">
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
                  <TableCell colSpan={8} className="text-center py-8">
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
                  <TableRow key={product.id}>
                    <TableCell>
                      <div className="w-16 h-16 rounded-md overflow-hidden bg-muted flex items-center justify-center">
                        {product.image ? (
                          <img 
                            src={product.image} 
                            alt={product.name}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none';
                              e.currentTarget.nextElementSibling.style.display = 'flex';
                            }}
                          />
                        ) : null}
                        <div className={`text-xs text-muted-foreground ${product.image ? 'hidden' : 'flex'} items-center justify-center w-full h-full`}>
                          Sem imagem
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{product.name}</div>
                        <div 
                          className="text-sm text-muted-foreground"
                          dangerouslySetInnerHTML={{ __html: product.description || '' }}
                        />
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{product.category}</Badge>
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
                    <TableCell className="text-right">
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
                          {/* <DropdownMenuItem onClick={() => onEditProduct(product)}>
                            <Edit className="mr-2 h-4 w-4" />
                            Editar
                          </DropdownMenuItem> */}
                          <DropdownMenuSeparator />
                          {/* <DropdownMenuItem 
                            className="text-destructive"
                            onClick={() => onDeleteProduct(product)}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Excluir
                          </DropdownMenuItem> */}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}