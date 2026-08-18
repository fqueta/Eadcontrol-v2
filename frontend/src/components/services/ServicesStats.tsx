import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Wrench, DollarSign, Clock, Star } from "lucide-react";
import type { Service } from "@/types/services";

interface ServicesStatsProps {
  services: Service[];
}

/**
 * Componente de estatísticas para serviços
 * Exibe métricas importantes como total de serviços, preço médio, duração média e distribuição por nível
 */
export function ServicesStats({ services }: ServicesStatsProps) {
  const totalServices = services.length;
  const activeServices = services.filter(s => s.active).length;
  
  // Calcula o preço médio dos serviços
  // pt-BR: price vem do backend como string (decimal:2); coerção evita NaN/concatenação.
  const averagePrice = services.length > 0
    ? services.reduce((sum, service) => sum + (Number(service.price) || 0), 0) / services.length
    : 0;

  // Calcula a duração média dos serviços (convertendo tudo para minutos)
  const averageDuration = services.length > 0
    ? services.reduce((sum, service) => {
        let durationInMinutes = Number(service.estimatedDuration) || 0;
        
        // Converte para minutos baseado na unidade
        switch (service.unit) {
          case 'horas':
          case 'hour':
          case 'hours':
            durationInMinutes *= 60;
            break;
          case 'dias':
          case 'day':
          case 'days':
            durationInMinutes *= 60 * 24;
            break;
          case 'semanas':
          case 'week':
          case 'weeks':
            durationInMinutes *= 60 * 24 * 7;
            break;
          // minutos já estão corretos
          default:
            break;
        }
        
        return sum + durationInMinutes;
      }, 0) / services.length
    : 0;
  
  // Conta serviços que requerem materiais
  const servicesWithMaterials = services.filter(s => s.requiresMaterials).length;
  
  // Conta serviços por nível de habilidade
  const expertServices = services.filter(s => s.skillLevel === 'expert').length;
  
  /**
   * Formata a duração média para exibição
   */
  const formatAverageDuration = (minutes: number): string => {
    if (minutes < 60) {
      return `${Math.round(minutes)} min`;
    } else if (minutes < 60 * 24) {
      const hours = Math.round(minutes / 60 * 10) / 10;
      return `${hours} h`;
    } else {
      const days = Math.round(minutes / (60 * 24) * 10) / 10;
      return `${days} dias`;
    }
  };

  /**
   * Formata um valor em reais (pt-BR) de forma determinística.
   * Ex.: 74444.5 -> R$ 74.444,50
   */
  const formatPrice = (value: number): string => {
    const safe = Number.isFinite(value) ? value : 0;
    const [int, dec] = safe.toFixed(2).split('.');
    const intFormatted = int.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    return `R$ ${intFormatted},${dec}`;
  };

  return (
    <div className="grid gap-4 md:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total de Serviços</CardTitle>
          <Wrench className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{totalServices}</div>
          <p className="text-xs text-muted-foreground">
            {activeServices} ativos
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Preço Médio</CardTitle>
          <DollarSign className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {formatPrice(averagePrice)}
          </div>
          <p className="text-xs text-muted-foreground">
            Por serviço
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Duração Média</CardTitle>
          <Clock className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatAverageDuration(averageDuration)}</div>
          <p className="text-xs text-muted-foreground">
            {servicesWithMaterials} requerem materiais
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Nível Expert</CardTitle>
          <Star className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{expertServices}</div>
          <p className="text-xs text-muted-foreground">
            Alta especialização
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

export default ServicesStats;