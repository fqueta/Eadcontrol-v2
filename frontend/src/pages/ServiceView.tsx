import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Wrench, Tag, DollarSign, Clock, Star, Calendar, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useService } from '@/hooks/services';
import type { Service } from '@/types/services';
import { SKILL_LEVELS } from '@/types/services';

/**
 * Página de visualização detalhada de um serviço específico
 * Exibe todas as informações do serviço de forma organizada
 */
export default function ServiceView() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: service, isLoading, error } = useService(id!);

  /**
   * Navega de volta para a listagem de serviços
   */
  const handleBack = () => {
    navigate('/admin/services');
  };

  /**
   * Formata valores monetários para exibição
   */
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  /**
   * Obtém o label do nível de habilidade
   */
  const getSkillLevelLabel = (skillLevel: string) => {
    const level = SKILL_LEVELS.find(level => level.value === skillLevel);
    return level?.label || skillLevel;
  };

  /**
   * Obtém a cor do badge baseado no nível de habilidade
   */
  const getSkillLevelVariant = (skillLevel: string): "default" | "secondary" | "destructive" | "outline" => {
    switch (skillLevel) {
      case 'basic':
        return 'secondary';
      case 'intermediate':
        return 'outline';
      case 'advanced':
        return 'default';
      case 'expert':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  /**
   * Formata a duração do serviço
   */
  const formatDuration = (duration: number, unit: string) => {
    return `${duration} ${unit}`;
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
              Erro ao carregar serviço
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">
              {error?.message || 'Não foi possível carregar as informações do serviço.'}
            </p>
            <Button onClick={handleBack} variant="outline">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Voltar para serviços
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!service) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-muted-foreground flex items-center gap-2">
              <Wrench className="h-5 w-5" />
              Serviço não encontrado
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">
              O serviço solicitado não foi encontrado ou pode ter sido removido.
            </p>
            <Button onClick={handleBack} variant="outline">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Voltar para serviços
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

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
            <h1 className="text-3xl font-bold tracking-tight">{service.name}</h1>
            <p className="text-muted-foreground">
              Visualização detalhada do serviço
            </p>
          </div>
        </div>
        <Badge variant={service.active ? "default" : "secondary"} className="text-sm">
          {service.active ? "Ativo" : "Inativo"}
        </Badge>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Informações Básicas */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wrench className="h-5 w-5" />
              Informações Básicas
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground">Nome</label>
              <p className="text-lg font-medium">{service.name}</p>
            </div>
            
            {service.description && (
              <div>
                <label className="text-sm font-medium text-muted-foreground">Descrição</label>
                <p className="text-sm">{service.description}</p>
              </div>
            )}
            
            <Separator />
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                  <Tag className="h-4 w-4" />
                  Categoria
                </label>
                <Badge variant="outline" className="mt-1">{service.category}</Badge>
              </div>
              
              <div>
                <label className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                  <Star className="h-4 w-4" />
                  Nível de Habilidade
                </label>
                <Badge variant={getSkillLevelVariant(service.skillLevel)} className="mt-1">
                  {getSkillLevelLabel(service.skillLevel)}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Informações de Preço e Duração */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Preço e Duração
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground">Preço do Serviço</label>
              <p className="text-2xl font-bold text-green-600">
                {formatCurrency(service.price)}
              </p>
            </div>
            
            <Separator />
            
            <div>
              <label className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                <Clock className="h-4 w-4" />
                Duração Estimada
              </label>
              <p className="text-lg font-medium mt-1">
                {formatDuration(service.estimatedDuration, service.unit)}
              </p>
            </div>
            
            <div>
              <label className="text-sm font-medium text-muted-foreground">Valor por Unidade de Tempo</label>
              <p className="text-sm text-muted-foreground">
                {service.unit === 'minutos' && `R$ ${(service.price / service.estimatedDuration).toFixed(2)} por minuto`}
                {service.unit === 'horas' && `R$ ${(service.price / service.estimatedDuration).toFixed(2)} por hora`}
                {service.unit === 'dias' && `R$ ${(service.price / service.estimatedDuration).toFixed(2)} por dia`}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Características do Serviço */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5" />
              Características
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 gap-4">
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-2">
                  {service.requiresMaterials ? (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  ) : (
                    <XCircle className="h-4 w-4 text-gray-400" />
                  )}
                  <span className="text-sm font-medium">Requer Materiais</span>
                </div>
                <Badge variant={service.requiresMaterials ? "default" : "secondary"}>
                  {service.requiresMaterials ? "Sim" : "Não"}
                </Badge>
              </div>
              
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-2">
                  {service.active ? (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  ) : (
                    <XCircle className="h-4 w-4 text-gray-400" />
                  )}
                  <span className="text-sm font-medium">Serviço Disponível</span>
                </div>
                <Badge variant={service.active ? "default" : "secondary"}>
                  {service.active ? "Ativo" : "Inativo"}
                </Badge>
              </div>
            </div>
            
            <Separator />
            
            <div>
              <label className="text-sm font-medium text-muted-foreground">Observações</label>
              <div className="text-sm text-muted-foreground mt-1 space-y-1">
                {service.requiresMaterials && (
                  <p>• Este serviço necessita de materiais específicos</p>
                )}
                <p>• Nível de habilidade: {getSkillLevelLabel(service.skillLevel)}</p>
                <p>• Duração estimada pode variar conforme complexidade</p>
              </div>
            </div>
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
              <label className="text-sm font-medium text-muted-foreground">ID do Serviço</label>
              <p className="text-sm font-mono bg-muted px-2 py-1 rounded">{service.id}</p>
            </div>
            
            {service.created_at && (
              <div>
                <label className="text-sm font-medium text-muted-foreground">Data de Criação</label>
                <p className="text-sm">{formatDate(service.created_at)}</p>
              </div>
            )}
            
            {service.updated_at && (
              <div>
                <label className="text-sm font-medium text-muted-foreground">Última Atualização</label>
                <p className="text-sm">{formatDate(service.updated_at)}</p>
              </div>
            )}
            
            <div>
              <label className="text-sm font-medium text-muted-foreground">Status</label>
              <div className="flex items-center gap-2 mt-1">
                <div className={`w-2 h-2 rounded-full ${
                  service.active ? 'bg-green-500' : 'bg-gray-400'
                }`} />
                <span className="text-sm">
                  {service.active ? 'Serviço ativo e disponível' : 'Serviço inativo'}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}