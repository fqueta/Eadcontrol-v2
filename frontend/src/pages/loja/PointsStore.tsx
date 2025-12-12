import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShoppingCart, Star, Gift, User, Search, Menu, X, Loader2, UserCircle, LogOut, Settings, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from '@/hooks/use-toast';
import { useStoreProductsList } from '@/hooks/products';
import { useCategoriesList } from '@/hooks/categories';
import { useAuth } from '@/contexts/AuthContext';
import { Product, PointsStoreProps } from '@/types/products';
import { Category } from '@/types/categories';
import { formatPoints } from '@/lib/utils';



// Interface para dados do usuário na loja (estendendo o User do auth)
interface StoreUser {
  name: string;
  points: number;
  avatar: string;
}

interface Product{
  id: number;
  name: string;
  shortDescription: string;
  description: string;
  price: number;
  points: number;
  isActive: boolean;
  category: Category;
  active?: boolean;
  available?: null;
  image?: string;
  costPrice?: string;
}
// Interface para as props do componente


/**
 * Componente da loja virtual de clube de pontos Yellow
 * Interface pública para resgate de produtos com pontos
 */
const PointsStore: React.FC<PointsStoreProps> = ({ linkLoja }) => {
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  
  /**
   * Função para rolar suavemente até a seção de produtos
   */
  const scrollToProducts = () => {
    const productsSection = document.getElementById('products');
    if (productsSection) {
      productsSection.scrollIntoView({ 
        behavior: 'smooth',
        block: 'start'
      });
    }
  };
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [cartItems, setCartItems] = useState<number[]>([]);

  // Obter dados do usuário autenticado
  const { user: authUser, logout, refreshUser } = useAuth();
  
  // Mapear dados do usuário autenticado para a interface da loja
  // console.log('authUser:', authUser);
  
  const user: StoreUser = {
    name: authUser?.name || 'Usuário',
    points: authUser?.points ? Number(authUser?.points) : 0, // TODO: Implementar pontos do usuário quando disponível na API
    avatar: authUser?.foto_perfil || authUser?.avatar || '' // Usar ícone User quando não há avatar
  };

  // Buscar produtos da vitrine da loja via endpoint '/point-store/products'
  // GET /point-store/products
  const { data: productsData, isLoading: productsLoading, error: productsError, refetch: refetchProducts } = useStoreProductsList({
    limit: 100,
    // entidade: 'produtos'
  });
  // Normaliza resposta: aceita array simples ou objeto paginado com 'data'
  const products: Product[] | any = Array.isArray(productsData) ? productsData : (productsData?.data || []);

  // Buscar categorias da API com limite de 5
  const { data: categoriesData, isLoading: categoriesLoading, error: categoriesError, refetch: refetchCategories } = useCategoriesList({ 
    limit: 5,
    // entidade: 'produtos'
  });
  
  // Sincronizar dados com a API sempre que a loja for aberta
  useEffect(() => {
    const syncData = async () => {
      try {
        // Sincronizar dados do usuário
        await refreshUser();
        
        // Refetch dos produtos e categorias
        await Promise.all([
          refetchProducts(),
          refetchCategories()
        ]);
      } catch (error) {
        console.error('Erro ao sincronizar dados da loja:', error);
      }
    };

    syncData();
  }, []); // Executa apenas na montagem do componente

  // Mapear categorias da API e adicionar categoria "Todos"
  const apiCategories = categoriesData?.data || [];
  const categories = [
    { id: 'all', name: 'Todos', icon: '🛍️' },
    ...apiCategories.map((category: Category) => ({
      id: category.id,
      name: category.name,
      icon: '📦' // Ícone padrão para categorias da API
    }))
  ];

  // Filtrar produtos
  const filteredProducts = products.filter(product => {
    const categoryId = product.category?.id || product.category || '';
    const matchesCategory = selectedCategory === 'all' || categoryId === selectedCategory;
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         product.description.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  });
  // console.log('filteredProducts:', filteredProducts);

  // Função para resgatar produto
  const handleRedeem = (product: Product) => {
    if (!product.isActive) {
      toast({
        title: "Produto indisponível",
        description: "Este produto está temporariamente fora de estoque.",
        variant: "destructive"
      });
      return;
    }

    const pointsRequired = product.pointsRequired || 0;
    if (user.points < pointsRequired) {
      toast({
        title: "Pontos insuficientes",
        description: `Você precisa de ${pointsRequired - user.points} pontos a mais para resgatar este produto.`,
        variant: "destructive"
      });
      return;
    }

    toast({
      title: "Produto resgatado com sucesso!",
      description: `${product.name} foi adicionado ao seu carrinho.`,
      variant: "default"
    });

    setCartItems([...cartItems, product.id]);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-yellow-50 via-orange-50 to-pink-50">
      {/* Header */}
      <header className="bg-gradient-to-r from-green-500 to-teal-600 shadow-lg sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <div className="flex items-center space-x-3">
              <img 
                src="/antena-logo-white.png" 
                alt="antena+ logo" 
                className="h-16"
              /> <span className="text-lg font-bold text-white">Oi TV</span>
            </div>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex space-x-8">
              <a href="/" className="text-white hover:text-yellow-300 px-3 py-2 text-sm font-medium transition-colors">Início</a>
              <button onClick={scrollToProducts} className="text-white hover:text-yellow-300 px-3 py-2 text-sm font-medium transition-colors bg-transparent border-none cursor-pointer">Produtos</button>
              {/* <a href="#categories" className="text-white hover:text-yellow-300 px-3 py-2 text-sm font-medium transition-colors">Categorias</a>
              <a href="#about" className="text-white hover:text-yellow-300 px-3 py-2 text-sm font-medium transition-colors">Sobre</a> */}
            </nav>

            {/* User Info & Cart */}
            <div className="flex items-center space-x-4">
              <div className="hidden sm:flex items-center space-x-2 bg-yellow-400 px-4 py-2 rounded-lg shadow-md">
                <Gift className="w-4 h-4 text-purple-800" />
                <span className="text-purple-800 text-sm font-medium">Seus pontos: </span>
                <span className="text-purple-900 font-bold">{formatPoints(user.points)}</span>
              </div>
              
              <div className="hidden sm:flex items-center space-x-2">
                {user.avatar ? (
                  <img src={user.avatar} alt={user.name} className="w-8 h-8 rounded-full" />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
                    <User className="w-4 h-4 text-gray-500" />
                  </div>
                )}
                <span className="text-sm text-gray-700">{user.name}</span>
              </div>

              {/* Dropdown de Administração da Conta */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="hidden sm:flex items-center space-x-1 hover:bg-white/20 border-yellow-300"
                  >
                    <UserCircle className="w-4 h-4 text-yellow-300" />
                    <span className="text-purple-800">Minha Conta</span>
                    <ChevronDown className="w-3 h-3 text-yellow-300" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 bg-white border-2 border-purple-200">
                  <DropdownMenuLabel className="bg-gradient-to-r from-purple-100 to-pink-100 text-purple-800">Administração da Conta</DropdownMenuLabel>
                  <DropdownMenuSeparator className="bg-purple-200" />
                  <DropdownMenuItem onClick={() => navigate(`${linkLoja}/area-cliente`)} className="hover:bg-yellow-50 text-gray-700">
                    <UserCircle className="mr-2 h-4 w-4 text-teal-600" />
                    <span>Minha Área</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate(`${linkLoja}/configuracoes`)} className="hover:bg-yellow-50 text-gray-700">
                    <Settings className="mr-2 h-4 w-4 text-purple-600" />
                    <span>Configurações</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator className="bg-purple-200" />
                  <DropdownMenuItem 
                    onClick={async () => {
                      await logout();
                      navigate('/login');
                    }}
                    className="text-red-600 focus:text-red-600 hover:bg-red-50"
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Sair</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* <Button variant="outline" size="sm" className="relative">
                <ShoppingCart className="w-4 h-4" />
                {cartItems.length > 0 && (
                  <Badge className="absolute -top-2 -right-2 w-5 h-5 flex items-center justify-center p-0 text-xs">
                    {cartItems.length}
                  </Badge>
                )}
              </Button> */}

              {/* Mobile menu button */}
              <Button
                variant="ghost"
                size="sm"
                className="md:hidden"
                onClick={() => setIsMenuOpen(!isMenuOpen)}
              >
                {isMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </Button>
            </div>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isMenuOpen && (
          <div className="md:hidden bg-white border-t">
            <div className="px-4 py-2 space-y-2">
              <div className="flex items-center space-x-2 bg-green-100 px-3 py-2 rounded-lg">
                <Gift className="w-4 h-4 text-green-600" />
                <span className="text-sm font-semibold text-green-800">{formatPoints(user.points)} pontos</span>
              </div>
              <a href="#home" className="block py-2 text-gray-700">Início</a>
              <button onClick={scrollToProducts} className="block py-2 text-gray-700 bg-transparent border-none cursor-pointer text-left w-full">Produtos</button>
              {/* <a href="#categories" className="block py-2 text-gray-700">Categorias</a> */}
              {/* <a href="#about" className="block py-2 text-gray-700">Sobre</a> */}
              
              {/* Seção de Administração da Conta - Mobile */}
              <div className="border-t pt-2 mt-2">
                <p className="text-xs text-gray-500 mb-2 px-2">Administração da Conta</p>
                <button 
                  onClick={() => {
                    navigate(`${linkLoja}/area-cliente`);
                    setIsMenuOpen(false);
                  }}
                  className="flex items-center space-x-2 py-2 text-gray-700 w-full text-left"
                >
                  <UserCircle className="w-4 h-4" />
                  <span>Minha Área</span>
                </button>
                <button 
                  onClick={() => {
                    navigate(`${linkLoja}/configuracoes`);
                    setIsMenuOpen(false);
                  }}
                  className="flex items-center space-x-2 py-2 text-gray-700 w-full text-left"
                >
                  <Settings className="w-4 h-4" />
                  <span>Configurações</span>
                </button>
                <button 
                  onClick={async () => {
                    await logout();
                    navigate('/login');
                    setIsMenuOpen(false);
                  }}
                  className="flex items-center space-x-2 py-2 text-red-600 w-full text-left"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Sair</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </header>

      {/* Hero Section */}
      <section id="home" className="py-10 px-4 sm:px-6 lg:px-8 bg-gradient-to-r from-purple-600 via-pink-500 to-orange-400">
        <div className="max-w-7xl mx-auto text-center">
          <h1 className="text-4xl font-bold text-white mb-4 drop-shadow-lg">
            Troque seus pontos por prêmios!
          </h1>
          <p className="text-xl text-yellow-200 mb-2 drop-shadow">
            Com o Antena+, cada venda realizada, cada cliente mantido na base ou indicação de novo credenciado geram pontos, que podem ser trocados por PIX, prêmios exclusivos, kits técnico, produtos Antena+ Oi TV e muito mais!
          </p>
          {/* <p className="text-lg text-white mb-8 drop-shadow">
            Você tem <span className="font-bold text-yellow-300 bg-purple-800 px-3 py-1 rounded-full">{user.points.toLocaleString()}</span> pontos disponíveis
          </p> */}
        </div>
      </section>

      {/* Search & Filters */}
      <section className="py-8 px-4 bg-gradient-to-r from-teal-50 to-purple-50 shadow-lg border-t-4 border-yellow-400">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="relative flex-1 max-w-100">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-purple-500 w-5 h-5" />
              <Input
                type="text"
                placeholder="Buscar produtos..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 border-2 border-purple-300 focus:ring-2 focus:ring-orange-400 focus:border-orange-400 bg-white shadow-md"
              />
            </div>
            
          </div>
        </div>
      </section>

      {/* Products Grid */}
      <section id="products" className="py-12 px-4">
        <div className="max-w-7xl mx-auto">
          <h3 className="text-2xl font-bold text-gray-900 mb-8 text-center">
            Produtos em Destaque
          </h3>
          
          {/* Loading State */}
          {productsLoading && (
            <div className="flex justify-center items-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-teal-600" />
              <span className="ml-2 text-gray-600">Carregando produtos...</span>
            </div>
          )}
          
          {/* Error State */}
          {productsError && (
            <div className="text-center py-12">
              <p className="text-red-500 text-lg">Erro ao carregar produtos. Tente novamente mais tarde.</p>
            </div>
          )}
          
          {/* Products Grid */}
          {!productsLoading && !productsError && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredProducts.map((product) => {
                  const pointsRequired = product.pointsRequired || 0;
                  return (
                    <Card key={product.id} className="overflow-hidden hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 border-2 border-purple-100 flex flex-col h-full">
                      <div className="relative">
                        <img
                          src={product.image || 'https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=300&h=300&fit=crop'}
                          alt={product.name}
                          className="w-full h-48 object-cover"
                        />
                        {!product.isActive && (
                          <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                            <span className="text-white font-semibold">Indisponível</span>
                          </div>
                        )}
                        {product.isActive && pointsRequired > 10000 && (
                          <Badge variant="outline" className="absolute top-2 right-2 bg-gradient-to-r from-yellow-400 to-orange-400 text-purple-800 font-bold shadow-md">
                            Premium
                          </Badge>
                        )}
                      </div>
                      
                      <CardHeader className="bg-gradient-to-b from-white to-purple-50 flex-grow">
                        <CardTitle className="text-lg font-bold text-purple-800">{product.name}</CardTitle>
                        <CardDescription 
                          dangerouslySetInnerHTML={{ __html: product.shortDescription }}
                        />
                        
                        {/* <div className="flex items-center space-x-1">
                          {[...Array(5)].map((_, i) => (
                            <Star
                              key={i}
                              className={`w-4 h-4 ${
                                i < 4 // Rating fixo de 4 estrelas
                                ? 'text-yellow-400 fill-current'
                                : 'text-gray-300'
                              }`}
                            />
                          ))}
                          <span className="text-sm text-gray-600 ml-2">4.0</span>
                        </div> */}
                      </CardHeader>
                      
                      <CardContent className="bg-gradient-to-b mt-4 from-white to-purple-50 mt-auto">
                        <div className="flex items-center justify-between mb-4">
                          <div>
                            <div className="text-2xl font-bold text-teal-600 bg-teal-100 px-2 py-1 rounded-full">
                              {pointsRequired.toLocaleString()} pts
                            </div>
                            {/* <div className="text-sm text-gray-500">
                              0 avaliações
                            </div> */}
                          </div>
                        </div>
                        
                        <Button
                          onClick={() => navigate(`${linkLoja}/produto/${product.slug || product.id}`)}
                          disabled={!product.isActive || user.points < pointsRequired}
                          className={`w-full font-bold transition-all duration-300 shadow-md ${
                            user.points >= pointsRequired && product.isActive
                              ? 'bg-gradient-to-r from-teal-500 to-green-500 hover:from-teal-600 hover:to-green-600 transform hover:scale-105'
                              : ''
                          }`}
                          variant={user.points >= pointsRequired && product.isActive ? "default" : "secondary"}
                        >
                          {!product.isActive
                            ? 'Indisponível'
                            : user.points < pointsRequired
                            ? 'Pontos Insuficientes'
                            : 'Resgatar Agora'
                          }
                        </Button>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
              
              {filteredProducts.length === 0 && !productsLoading && (
                <div className="text-center py-12">
                  <p className="text-gray-500 text-lg">Nenhum produto encontrado.</p>
                </div>
              )}
            </>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gradient-to-r from-purple-800 via-purple-900 to-teal-800 text-white py-12 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div>
              <div className="flex items-center space-x-3 mb-4">
                {/* <img 
                    src="/antena-log2.png" 
                    alt="antena+ logo" 
                    className="h-16"
                  /> */}
                  <span className="text-2xl font-bold">
                  Antena+ Oi TV
                  </span>
              </div>
              <p className="text-purple-200">
                Transformando pontos em experiências incríveis.
              </p>
            </div>
            
            {/* <div>
              <h4 className="font-bold mb-4 text-yellow-300">Produtos</h4>
              <ul className="space-y-2 text-purple-200">
                <li><a href="#" className="hover:text-yellow-300 transition-colors">Eletrônicos</a></li>
                <li><a href="#" className="hover:text-yellow-300 transition-colors">Casa & Decoração</a></li>
                <li><a href="#" className="hover:text-yellow-300 transition-colors">Moda</a></li>
                <li><a href="#" className="hover:text-yellow-300 transition-colors">Viagens</a></li>
              </ul>
            </div> */}
            
            <div>
              <h4 className="font-bold mb-4 text-yellow-300">Suporte</h4>
              <ul className="space-y-2 text-purple-200">
                {/* <li><a href="#" className="hover:text-yellow-300 transition-colors">Central de Ajuda</a></li> */}
                <li><a href="#" className="hover:text-yellow-300 transition-colors">Como Funciona</a></li>
                <li><a target="_blank" href="https://docs.oitv.net/politicas_programa_pts_antenamais.pdf" className="hover:text-yellow-300 transition-colors">Termos de Uso</a></li>
                <li><a target="_blank" href="https://docs.oitv.net/politica_privacidade_pts_antenamais.pdf" className="hover:text-yellow-300 transition-colors">Privacidade</a></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-bold mb-4 text-yellow-300">Fale Conosco</h4>
              <ul className="space-y-2 text-purple-200">
                <li>contato@yellowbc.com.br</li>
                <li>
                  <a 
                    href="https://wa.me/553208000004338?text=" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 hover:text-yellow-400 transition-colors"
                  >
                    <svg 
                      className="w-4 h-4" 
                      viewBox="0 0 24 24" 
                      fill="currentColor"
                    >
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0020.465 3.488"/>
                    </svg>
                    0800 000 4338
                  </a>
                </li>
                {/* <li>São Paulo, SP</li> */}
              </ul>
            </div>
          </div>
          
          <div className="border-t border-purple-600 mt-8 pt-8 text-center text-purple-200">
            <p>&copy; {new Date().getFullYear()} Oi TV Loja do antenista Clube de Pontos. Todos os direitos reservados.</p> 
            <p>Desenvolvido por <a href="https://mastertechbr.com/" target="_blank">Mastertech</a></p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default PointsStore;