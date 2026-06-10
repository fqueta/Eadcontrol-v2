import InclusiveSiteLayout from '@/components/layout/InclusiveSiteLayout';
import ProductsHero from '@/components/products/ProductsHero';
import ProductsGrid from '@/components/products/ProductsGrid';

export default function ProductsPublicList() {
  return (
    <InclusiveSiteLayout>
      <div className="space-y-0">
        <ProductsHero />
        <div className="container mx-auto px-4 pb-16">
          <ProductsGrid />
        </div>
      </div>
    </InclusiveSiteLayout>
  );
}
