import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Package, Tag, Star, MessageSquare, Calendar, AlertTriangle, Clock, ExternalLink, Copy, Check, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useProduct, useUpdateProduct } from '@/hooks/products';
// import type { Product } from '@/types/products';
import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { toast } from '@/hooks/use-toast';

/**
 * Página de visualização detalhada de um produto específico
 * Exibe todas as informações do produto de forma organizada
 */
export default function ProductView() {
  const link_admin = '/admin';
  const link_loja = '/lojaderesgatesantenamais'; // URL base da loja
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: productData, isLoading, error } = useProduct(id!);
  const product = productData as any;
  const [copied, setCopied] = useState(false);
  // console.log('product', product);
  /**
   * Navega de volta para a listagem de produtos
   */
  const handleBack = () => {
    navigate(link_admin + '/products');
  };

  /**
   * Gera um slug baseado no nome do produto
   * @param name - Nome do produto
   */
  const generateSlug = (name: string): string => {
    return name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Remove acentos
      .replace(/[^a-z0-9\s-]/g, '') // Remove caracteres especiais
      .trim()
      .replace(/\s+/g, '-') // Substitui espaços por hífens
      .replace(/-+/g, '-'); // Remove hífens duplicados
  };

  /**
   * Gera o link para visualização do produto na loja
   */
  const getStoreProductLink = (): string => {
    if (!product) return '';
    const slug = product.slug || generateSlug(product.name);
    return `${window.location.origin}${link_loja}/produto/${slug}`;
  };

  /**
   * Copia o link do produto para a área de transferência
   */
  const copyLinkToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(getStoreProductLink());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Erro ao copiar link:', err);
    }
  };

  /**
   * Formata a data de validade
   */
  const formatValidUntil = (dateString?: string) => {
    if (!dateString) return null;
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('pt-BR');
    } catch {
      return dateString;
    }
  };

  /**
   * Formata a data para exibição no formato brasileiro
   */
  const formatDate = (dateString: string) => {
    if (!dateString) return 'Não informado';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return dateString;
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-destructive flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Erro ao carregar produto
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">
              {error?.message || 'Não foi possível carregar as informações do produto.'}
            </p>
            <Button onClick={handleBack} variant="outline">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Voltar para produtos
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  if (!product) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-muted-foreground flex items-center gap-2">
              <Package className="h-5 w-5" />
              Produto não encontrado
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">
              O produto solicitado não foi encontrado ou pode ter sido removido.
            </p>
            <Button onClick={handleBack} variant="outline">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Voltar para produtos
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isLimitedAvailability = product.availability === 'limited';
  const isUnavailable = product.availability === 'unavailable';

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button
            variant="outline"
            size="sm"
            onClick={handleBack}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{product.name}</h1>
            <p className="text-muted-foreground">
              Visualização detalhada do produto
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={
            product.inStock === true ? "default" : 
            product.inStock === false ? "destructive" : "secondary"
          } className="text-sm">
            {product.inStock === true ? "Disponível" : 
             product.inStock === false ? "Indisponível" : "Limitado"}
          </Badge>
          {product.stock !== undefined && (
            <Badge variant="outline" className="text-sm">
              Estoque: {product.stock}
            </Badge>
          )}
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Informações Básicas */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Informações Básicas
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground">Nome</label>
              <p className="text-lg font-medium">{product.name}</p>
            </div>
            
            {product.description && (
              <div>
                <label className="text-sm font-medium text-muted-foreground">Descrição</label>
                <div 
                  className="text-sm"
                  dangerouslySetInnerHTML={{ __html: product.description }}
                />
              </div>
            )}
            
            <Separator />
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                  <Tag className="h-4 w-4" />
                  Categoria
                </label>
                <Badge variant="outline" className="mt-1">{product.categoryData?.name || product.category || 'Não informado'}</Badge>
              </div>
              
              <div>
                <label className="text-sm font-medium text-muted-foreground">Unidade</label>
                <p className="text-sm font-medium">{product.unitData?.name || product.unit || 'Não informado'}</p>
              </div>
              
              <div>
                <label className="text-sm font-medium text-muted-foreground">Quantidade em Estoque</label>
                <p className="text-sm font-medium">{product.stock !== undefined ? product.stock : 'Não informado'}</p>
              </div>
            </div>
            
            <Separator />
            
            <div>
              <label className="text-sm font-medium text-muted-foreground">Pontos Necessários</label>
              <p className="text-2xl font-bold text-primary">{product.pointsRequired || 0}</p>
            </div>
            
            <Separator />
            
            <div>
              <label className="text-sm font-medium text-muted-foreground">Visualizar na Loja</label>
              <div className="mt-2 space-y-3">
                <div className="p-3 bg-muted rounded-md">
                  <p className="text-xs text-muted-foreground mb-1">Link do produto na loja:</p>
                  <p className="text-sm font-mono break-all">{getStoreProductLink()}</p>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.open(getStoreProductLink(), '_blank')}
                    className="flex items-center gap-2"
                  >
                    <ExternalLink className="h-4 w-4" />
                    Abrir na Loja
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={copyLinkToClipboard}
                    className="flex items-center gap-2"
                  >
                    {copied ? (
                      <>
                        <Check className="h-4 w-4 text-green-600" />
                        Copiado!
                      </>
                    ) : (
                      <>
                        <Copy className="h-4 w-4" />
                        Copiar Link
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Avaliações e Reviews */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Star className="h-5 w-5" />
              Avaliações e Reviews
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Avaliação</label>
                <div className="flex items-center gap-2">
                  <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                  <p className="text-lg font-medium">{(product.rating || 0).toFixed(1)}</p>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Total de Reviews</label>
                <div className="flex items-center gap-2">
                  <MessageSquare className="h-4 w-4" />
                  <p className="text-lg font-medium">{product.reviews || 0}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Termos e Condições */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Termos e Condições
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground">Disponibilidade</label>
              <div className="flex items-center gap-2 mt-1">
                <div className={`w-2 h-2 rounded-full ${
                  product.inStock === true ? 'bg-green-500' : 
                  product.inStock === false ? 'bg-red-500' : 'bg-yellow-500'
                }`} />
                <p className="text-lg font-medium">
                  {product.inStock === true ? 'Disponível' : 
                  product.inStock === false ? 'Indisponível' : 'Limitado'}
                </p>
                {product.stock !== undefined && (
                  <span className="text-sm text-muted-foreground">({product.stock} unidades)</span>
                )}
              </div>
              {isLimitedAvailability && (
                <div className="flex items-center gap-1 mt-2">
                  <AlertTriangle className="h-4 w-4 text-yellow-500" />
                  <span className="text-sm text-yellow-600 font-medium">
                    Disponibilidade limitada - Resgate enquanto há estoque
                  </span>
                </div>
              )}
              {isUnavailable && (
                <div className="flex items-center gap-1 mt-2">
                  <AlertTriangle className="h-4 w-4 text-destructive" />
                  <span className="text-sm text-destructive font-medium">
                    Produto indisponível no momento
                  </span>
                </div>
              )}
            </div>
            
            <Separator />
            
            <div>
              <label className="text-sm font-medium text-muted-foreground">Termos de Uso</label>
              <div className="space-y-1 mt-1">
                {product.terms && product.terms.length > 0 ? (
                  <ul className="text-sm text-muted-foreground space-y-1">
                    {product.terms.map((term, index) => (
                      <li key={index} className="flex items-start gap-2">
                        <span className="text-primary mt-1">•</span>
                        <span>{term.trim()}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-muted-foreground">Nenhum termo específico</p>
                )}
              </div>
            </div>
            
            {product.validUntil && (
              <>
                <Separator />
                <div>
                  <label className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    Válido Até
                  </label>
                  <p className="text-lg font-medium text-orange-600 mt-1">
                    {formatValidUntil(product.validUntil)}
                  </p>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Informações do Sistema */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Informações do Sistema
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground">ID do Produto</label>
              <p className="text-sm font-mono bg-muted px-2 py-1 rounded">{product.id}</p>
            </div>
            
            {product.image && (
              <div>
                <label className="text-sm font-medium text-muted-foreground">Imagem do Produto</label>
                <div className="mt-2">
                  <img 
                    src={product.image} 
                    alt={product.name}
                    className="w-full max-w-xs rounded-lg border"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}