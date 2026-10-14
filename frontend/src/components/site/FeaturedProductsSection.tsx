import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, ShoppingBag, Star } from "lucide-react";
import { getTenantApiUrl, getVersionApi } from "@/lib/qlib";
import { FeaturedProductsConfig, FeaturedProductsEditor } from "./FeaturedProductsEditor";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { DynamicPrice } from "../common/DynamicPrice";
import { CatalogCard } from "../common/CatalogCard";

interface Product {
  id: string | number;
  name: string;
  description: string;
  slug: string;
  salePrice?: string | number;
  image?: string | null;
  destaque?: 's' | 'n';
  categoryData?: { id: string | number; name: string } | null;
  parcelas?: string | number;
  valor_parcela?: string | number;
}

const DEFAULT_CONFIG: FeaturedProductsConfig = {
  title: "Produtos em Destaque",
  subtitle: "Confira nossa seleção de produtos especiais para você.",
  backgroundColor: "#ffffff",
  gradientColorTo: "",
  accentColor: "",
  titleColor: "#0f172a",
  subtitleColor: "#475569",
  titleSize: "3rem",
  textAlign: "center",
  marginTop: "4rem",
  marginBottom: "4rem",
  paddingTop: "0rem",
  paddingBottom: "0rem",
  showViewAll: true,
  viewAllText: "Ver todos os produtos"
};

const stripHtml = (html: string) => {
  if (!html) return "";
  return html.replace(/<[^>]*>?/gm, '').replace(/&nbsp;/g, ' ').replace(/&quot;/g, '"');
};

export function FeaturedProductsSection() {
  const { user } = useAuth();
  const { darkMode } = useTheme();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [config, setConfig] = useState<FeaturedProductsConfig>(DEFAULT_CONFIG);

  const canEdit = !!user && Number(user?.permission_id ?? 9999) < 3;

  useEffect(() => {
    async function fetchData() {
      try {
        const baseUrl = getTenantApiUrl() + getVersionApi();
        
        // 1. Fetch config from options/branding
        const optResponse = await fetch(`${baseUrl}/public/options/branding`);
        if (optResponse.ok) {
          const optJson = await optResponse.json();
          const savedConfig = optJson.data?.featured_products_config;
          if (savedConfig) {
            try {
              const parsed = typeof savedConfig === 'string' ? JSON.parse(savedConfig) : savedConfig;
              setConfig({ ...DEFAULT_CONFIG, ...parsed });
            } catch (e) {
              console.error("Failed to parse featured_products_config", e);
            }
          }
        }

        // 2. Fetch products
        const response = await fetch(`${baseUrl}/public/products?destaque=s&per_page=6`);
        if (response.ok) {
          const json = await response.json();
          setProducts(Array.isArray(json.data) ? json.data : (json.data?.data || []));
        }
      } catch (error) {
        console.error("Failed to fetch featured products:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  if (loading) {
    return (
      <section className="py-24" style={{ backgroundColor: config.backgroundColor }}>
        <div className="container mx-auto px-4">
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          </div>
        </div>
      </section>
    );
  }

  if (products.length === 0 && !canEdit) return null;

  const finalBgColor = darkMode 
    ? (config.backgroundColor === "#f8fafc" || config.backgroundColor === "#ffffff" ? "transparent" : config.backgroundColor)
    : config.backgroundColor;

  const finalGradientTo = darkMode
    ? (config.gradientColorTo === "#f8fafc" || config.gradientColorTo === "#ffffff" ? "" : config.gradientColorTo)
    : config.gradientColorTo;

  const bgStyle = finalGradientTo 
    ? `linear-gradient(to right, ${finalBgColor}, ${finalGradientTo})`
    : finalBgColor;

  const finalTitleColor = darkMode
    ? (config.titleColor === "#0f172a" || config.titleColor === "#000000" ? "#f8fafc" : config.titleColor)
    : config.titleColor;

  const finalSubtitleColor = darkMode
    ? (config.subtitleColor === "#475569" || config.subtitleColor === "#1e293b" ? "#94a3b8" : config.subtitleColor)
    : config.subtitleColor;

  return (
    <section 
      className="transition-colors duration-500 relative min-h-[400px] flex flex-col justify-center" 
      style={{ 
        background: bgStyle,
        marginTop: config.marginTop,
        marginBottom: config.marginBottom,
        paddingTop: config.paddingTop,
        paddingBottom: config.paddingBottom
      }}
    >
      {/* Editor component rendered here for admins */}
      <FeaturedProductsEditor 
        currentConfig={config} 
        onConfigChange={(newConfig) => setConfig(newConfig)} 
      />

      <div className="container mx-auto px-4">
        {products.length > 0 ? (
          <>
            <div 
              className={`flex flex-col gap-6 mb-12 ${
                config.textAlign === 'center' 
                  ? 'text-center items-center' 
                  : config.textAlign === 'right' 
                    ? 'text-right items-end md:flex-row md:justify-between' 
                    : 'text-left items-start md:flex-row md:justify-between'
              }`}
            >
              <div className={`max-w-2xl ${config.textAlign === 'center' ? 'mx-auto' : config.textAlign === 'right' ? 'ml-auto' : ''}`}>
                <h2 
                  className="font-black mb-4 tracking-tight leading-tight" 
                  style={{ color: finalTitleColor, fontSize: config.titleSize }}
                >
                  {config.title}
                </h2>
                <div 
                  className={`w-20 h-1.5 rounded-full mb-6 ${config.accentColor ? '' : 'bg-primary'} ${config.textAlign === 'center' ? 'mx-auto' : config.textAlign === 'right' ? 'ml-auto' : ''}`}
                  style={config.accentColor ? { backgroundColor: config.accentColor } : {}}
                />
                <p className="text-lg font-medium opacity-90" style={{ color: finalSubtitleColor }}>
                  {config.subtitle}
                </p>
              </div>
              {config.showViewAll && (
                <Button 
                  variant="ghost" 
                  className={`font-bold gap-2 group ${config.accentColor ? '' : 'text-primary hover:text-primary/80'}`} 
                  style={config.accentColor ? { color: config.accentColor } : {}}
                  asChild
                >
                  <Link to="/produtos">
                    {config.viewAllText}
                    <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
                  </Link>
                </Button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {products.map((product) => (
                <CatalogCard
                  key={product.id}
                  type="product"
                  id={product.id}
                  title={product.name || "Produto sem título"}
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
                  hideCategory={config.hideCategory}
                  hideDescription={config.hideDescription}
                  imageAspect={config.imageAspect}
                />
              ))}
            </div>
          </>
        ) : (
          <div className="text-center py-16 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-3xl animate-in fade-in zoom-in duration-700">
            <div className="w-20 h-20 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-6">
              <Star className="h-10 w-10 text-slate-300 animate-pulse" />
            </div>
            <h3 className="text-2xl font-black text-slate-400 uppercase tracking-tighter mb-2">Vitrine Vazia</h3>
            <p className="text-slate-500 font-medium max-w-md mx-auto">
              Nenhum produto marcado como <strong className="text-primary">destaque</strong> foi encontrado. 
              Vá ao painel e ative o botão de destaque em seus melhores produtos!
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
