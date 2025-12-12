import { Card } from "@/components/ui/card";
import { TrendingUp, TrendingDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface KPICardProps {
  title: string;
  value: string | number;
  variation?: number;
  format?: 'currency' | 'percentage' | 'number';
  className?: string;
}

export const KPICard = ({ title, value, variation, format = 'number', className }: KPICardProps) => {
  const formatValue = (val: string | number) => {
    if (format === 'currency') {
      return `R$ ${typeof val === 'number' ? val.toLocaleString('pt-BR') : val}`;
    }
    if (format === 'percentage') {
      return `${val}%`;
    }
    return typeof val === 'number' ? val.toLocaleString('pt-BR') : val;
  };

  const getVariationColor = (variation?: number) => {
    if (!variation) return '';
    return variation > 0 ? 'text-success' : 'text-destructive';
  };

  const getVariationIcon = (variation?: number) => {
    if (!variation) return null;
    return variation > 0 ? 
      <TrendingUp className="w-4 h-4" /> : 
      <TrendingDown className="w-4 h-4" />;
  };

  return (
    <Card className={cn("p-3 md:p-6 border-border bg-card hover:shadow-lg transition-shadow", className)}>
      <div className="space-y-1 md:space-y-2">
        <p className="text-xs md:text-sm font-medium text-muted-foreground uppercase tracking-wide truncate">
          {title}
        </p>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-1">
          <p className="text-lg md:text-3xl font-bold text-foreground truncate">
            {formatValue(value)}
          </p>
          {variation !== undefined && (
            <div className={cn("flex items-center gap-1 text-xs md:text-sm font-medium", getVariationColor(variation))}>
              {getVariationIcon(variation)}
              <span>{Math.abs(variation)}%</span>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
};