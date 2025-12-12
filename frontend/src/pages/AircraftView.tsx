import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Plane, User, Calendar, FileText, Database } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAircraft } from '@/hooks/aircraft';
import type { AircraftRecord } from '@/types/aircraft';

/**
 * Página de visualização detalhada de uma aeronave específica
 * Exibe todas as informações do cadastro da aeronave de forma organizada
 */
export default function AircraftView() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: aircraft, isLoading, error } = useAircraft(id!);
  
  // Debug logs
  // console.log('AircraftView - ID from params:', id);
  // console.log('AircraftView - Aircraft data:', aircraft);
  // console.log('AircraftView - Loading state:', isLoading);
  // console.log('AircraftView - Error state:', error);
  /**
   * Navega de volta para a listagem de aeronaves
   */
  const handleBack = () => {
    navigate('/admin/aircraft');
  };

  /**
   * Formata a data para exibição no formato brasileiro
   */
  const formatDate = (dateString: string) => {
    if (!dateString) return 'Não informado';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('pt-BR');
    } catch {
      return dateString;
    }
  };

  /**
   * Renderiza os dados JSON do campo config em formato de tabela
   */
  const renderConfigTable = () => {
    if (!aircraft?.config) return null;

    let configData;
    try {
      configData = typeof aircraft.config === 'string' 
        ? JSON.parse(aircraft.config) 
        : aircraft.config;
    } catch {
      return (
        <div className="text-sm text-muted-foreground">
          Dados de configuração inválidos
        </div>
      );
    }

    if (!configData || typeof configData !== 'object') {
      return (
        <div className="text-sm text-muted-foreground">
          Nenhum dado de configuração disponível
        </div>
      );
    }

    const entries = Object.entries(configData);
    if (entries.length === 0) {
      return (
        <div className="text-sm text-muted-foreground">
          Nenhum dado de configuração disponível
        </div>
      );
    }

    return (
      <div className="border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b">
              <th className="px-4 py-3 text-left font-medium text-gray-900">
                Campo
              </th>
              <th className="px-4 py-3 text-left font-medium text-gray-900">
                Valor
              </th>
            </tr>
          </thead>
          <tbody>
            {entries.map(([key, value], index) => (
              <tr key={key} className={index % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                <td className="px-4 py-3 font-medium text-gray-900 border-r">
                  {key}
                </td>
                <td className="px-4 py-3 text-gray-700">
                  {value !== null && value !== undefined ? String(value) : 'N/A'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Carregando informações da aeronave...</p>
        </div>
      </div>
    );
  }

  // Verificação se o ID é válido
  if (!id) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-destructive mb-2">ID da aeronave não fornecido</h2>
          <p className="text-muted-foreground mb-4">
            O ID da aeronave é obrigatório para visualização.
          </p>
          <Button onClick={handleBack} variant="outline">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar para listagem
          </Button>
        </div>
      </div>
    );
  }

  if (error) {
    console.error('AircraftView - Error details:', error);
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-destructive mb-2">Erro ao carregar aeronave</h2>
          <p className="text-muted-foreground mb-4">
            {error.message || 'Não foi possível carregar as informações da aeronave.'}
          </p>
          <p className="text-xs text-muted-foreground mb-4">
            ID solicitado: {id}
          </p>
          <Button onClick={handleBack} variant="outline">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar para listagem
          </Button>
        </div>
      </div>
    );
  }

  if (!aircraft) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">Aeronave não encontrada</h2>
          <p className="text-muted-foreground mb-4">
            A aeronave solicitada não foi encontrada.
          </p>
          <Button onClick={handleBack} variant="outline">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar para listagem
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button onClick={handleBack} variant="outline" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{aircraft.matricula}</h1>
            <p className="text-muted-foreground">
              Aeronave
            </p>
          </div>
        </div>
        <Badge variant={aircraft.active ? 'default' : 'destructive'}>
          {aircraft.active ? 'Ativa' : 'Inativa'}
        </Badge>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Informações Básicas */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Plane className="mr-2 h-5 w-5" />
              Informações Básicas
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground">Matrícula</label>
              <p className="text-sm font-mono">{aircraft.matricula}</p>
            </div>
            
            <div>
              <label className="text-sm font-medium text-muted-foreground">Proprietário</label>
              <p className="text-sm">{aircraft.client?.name || 'Não informado'}</p>
            </div>

            <div>
              <label className="text-sm font-medium text-muted-foreground">Status</label>
              <p className="text-sm">
                <Badge variant={aircraft.active ? 'default' : 'destructive'} className="text-xs">
                  {aircraft.active ? 'Ativa' : 'Inativa'}
                </Badge>
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Informações do Sistema */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Calendar className="mr-2 h-5 w-5" />
              Informações do Sistema
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {aircraft.created_at && (
              <div>
                <label className="text-sm font-medium text-muted-foreground">Data de Cadastro</label>
                <p className="text-sm">{formatDate(aircraft.created_at)}</p>
              </div>
            )}

            {aircraft.updated_at && (
              <div>
                <label className="text-sm font-medium text-muted-foreground">Última Atualização</label>
                <p className="text-sm">{formatDate(aircraft.updated_at)}</p>
              </div>
            )}

            <div>
              <label className="text-sm font-medium text-muted-foreground">ID da Aeronave</label>
              <p className="text-sm font-mono">{aircraft.id}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Descrição */}
      {aircraft.description && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <FileText className="mr-2 h-5 w-5" />
              Descrição
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm whitespace-pre-wrap">{aircraft.description}</p>
          </CardContent>
        </Card>
      )}

      {/* Dados de Configuração (RAB) */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Database className="mr-2 h-5 w-5" />
            Dados de Configuração (RAB)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {renderConfigTable()}
        </CardContent>
      </Card>
    </div>
  );
}