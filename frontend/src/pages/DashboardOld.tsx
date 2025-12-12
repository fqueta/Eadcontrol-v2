import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  FileText,
  ClipboardList,
  DollarSign,
  TrendingUp,
  Users,
  Calendar,
  AlertCircle,
  CheckCircle,
  Clock,
  Plus,
  UserCheck,
  Package,
  Handshake,
} from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { Link } from "react-router-dom";
import { useClientsList } from "@/hooks/clients";
import { usePartnersList } from "@/hooks/partners";
import { useProductsList } from "@/hooks/products";
import { useUsersList } from "@/hooks/users";
import { useRecentActivities, useRegistrationData, usePendingPreRegistrations } from "@/hooks/useDashboard";
import { ClientRegistrationChart } from "@/components/ClientRegistrationChart";
import { VisitorTrendChart } from "@/components/VisitorTrendChart";
import { useAuth } from "@/contexts/AuthContext";

/**
 * Dashboard
 * Página principal que exibe cards de resumo e gráficos.
 * Regra de visibilidade: oculta o card "Parceiros" para usuários
 * com `permission_id` maior ou igual a 5.
 */
export default function Dashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const userPermission = Number(user?.permission_id ?? 0);
  const canShowPartners = userPermission < 5;
  // Hooks para buscar dados das entidades
  const { data: clientsData, isLoading: clientsLoading } = useClientsList({ limit: 1 });
  const { data: partnersData, isLoading: partnersLoading } = usePartnersList({ limit: 1 });
  const { data: productsData, isLoading: productsLoading } = useProductsList({ limit: 1 });
  const { data: usersData, isLoading: usersLoading } = useUsersList({ limit: 1 });

  // Hooks para dados dinâmicos do dashboard
  const { data: recentActivities, isLoading: activitiesLoading, error: activitiesError } = useRecentActivities(4);
  const { data: registrationData, isLoading: registrationLoading, error: registrationError } = useRegistrationData();
  const { data: pendingPreRegistrations, isLoading: pendingLoading, error: pendingError } = usePendingPreRegistrations(3);
  // console.log('pendingPreRegistrations:', pendingPreRegistrations);
  // Verificar se há erro 403 (Acesso negado)
  const hasAccessError = [activitiesError, registrationError, pendingError].some(
    error => error && (error as any)?.status === 403
  );
  // console.log('activitiesError:', activitiesError);
  
  // Verificar se ainda está carregando dados iniciais
  const isInitialLoading = (
    activitiesLoading || 
    registrationLoading || 
    pendingLoading
  ) && !hasAccessError;

  /**
   * Abre a visualização rápida do cliente
   * Navega para `/admin/clients/:id/view` utilizando o ID da atividade.
   */
  const location = useLocation();
  /**
   * handleQuickViewClient
   * pt-BR: Navega para a visualização do cliente e inclui `state.from` com a origem.
   * en-US: Navigates to client view and includes `state.from` with the origin.
   */
  const handleQuickViewClient = (id: string | number) => {
    navigate(`/admin/clients/${String(id)}/view`, { state: { from: location } });
  };

  // Se há erro de acesso, exibir apenas a mensagem
  if (hasAccessError) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-semibold text-gray-900 mb-2">Acesso não disponível</h2>
          <p className="text-gray-600">Você não tem permissão para acessar o dashboard.</p>
        </div>
      </div>
    );
  }

  // Se ainda está carregando, não mostrar nada para evitar flash de conteúdo
  if (isInitialLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
          <p className="text-gray-500">Carregando dashboard...</p>
        </div>
      </div>
    );
  }

  // Dados das entidades
  const stats = {
    clientsCount: clientsData?.total || 0,
    partnersCount: partnersData?.total || 0,
    productsCount: productsData?.total || 0,
    usersCount: usersData?.total || 0,
  };

  // Dados dinâmicos ou fallback para dados mock
  const recentClientActivities = recentActivities || [];
  const clientRegistrationData = registrationData || [];
  const pendingPreRegistrationsData = pendingPreRegistrations || [];
  // console.log('pendingPreRegistrationsData:', pendingPreRegistrationsData);
  // Verificação simples dos dados de registro
  // if (clientRegistrationData.length > 0) {
  //   console.log(`Dashboard: ${clientRegistrationData.length} dias de dados carregados (${clientRegistrationData[0]?.date} a ${clientRegistrationData[clientRegistrationData.length - 1]?.date})`);
  // }
  
  //console.log('clientRegistrationData:', clientRegistrationData);
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            Visão geral do sistema de clientes
          </p>
        </div>
        <div className="flex gap-2">
          {/* <Button asChild>
            <Link to="/admin/budgets/new">
              <Plus className="mr-2 h-4 w-4" />
              Novo Cliente
            </Link>
          </Button> */}
          {/* <Button variant="outline" asChild>
            <Link to="/admin/service-orders/new">
              <FileText className="mr-2 h-4 w-4" />
              Todos clientes
            </Link>
          </Button> */}
        </div>
      </div>



      
      {/* Seção de Gráficos e Tendências */}
      <div className="space-y-6">
        {/* <div>
          <h2 className="text-xl font-semibold mb-4">Gráficos e Tendências</h2>
        </div> */}
        
        {/* Gráfico de Tendência de Visitantes */}
        {/* <VisitorTrendChart /> */}
        
        {/* Gráfico de Cadastros de Clientes */}
        {registrationLoading ? (
          <Card>
            <CardHeader>
              <CardTitle>Evolução dos Cadastros de Clientes</CardTitle>
              <CardDescription>Acompanhamento diário dos cadastros por status nos últimos 14 dias</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <p className="text-sm text-muted-foreground">Carregando dados do gráfico...</p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <ClientRegistrationChart 
            data={clientRegistrationData}
            title="Evolução dos Cadastros de Clientes"
            description="Acompanhamento diário dos cadastros por status nos últimos 14 dias"
          />
        )}
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent Client Activities */}
        <Card>
          <CardHeader>
            <CardTitle>Atividades Recentes - Clientes</CardTitle>
            <CardDescription>
              Últimos cadastros e alterações de clientes
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {activitiesLoading ? (
                <div className="text-center py-4">
                  <p className="text-sm text-muted-foreground">Carregando atividades...</p>
                </div>
              ) : recentClientActivities.length === 0 ? (
                <div className="text-center py-4">
                  <p className="text-sm text-muted-foreground">Nenhuma atividade recente</p>
                </div>
              ) : (
                recentClientActivities.map((activity) => (
                  <div key={activity.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${
                        activity.status === "actived" ? "bg-green-100" :
                        activity.status === "inactived" ? "bg-red-100" : "bg-yellow-100"
                      }`}>
                        <Users className={`h-4 w-4 ${
                          activity.status === "actived" ? "text-green-600" :
                          activity.status === "inactived" ? "text-red-600" : "text-yellow-600"
                        }`} />
                      </div>
                      <div>
                        <p className="text-sm font-medium">{activity.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {activity.client} • {activity.time}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {activity.cpf || activity.cnpj}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge variant={
                        activity.status === "actived" ? "default" :
                        activity.status === "inactived" ? "destructive" : "secondary"
                      }>
                        {activity.status === "actived" && "Ativo"}
                        {activity.status === "inactived" && "Inativo"}
                        {activity.status === "pre_registred" && "Pré-cadastro"}
                      </Badge>
                      <div className="flex gap-1 justify-end mt-2">
                        <Button onClick={() => handleQuickViewClient(activity.id)} size="sm" variant="outline" className="text-xs px-2">
                          Visualizar
                        </Button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Pending Pre-Registrations */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserCheck className="h-4 w-4" />
              Pré-cadastros Pendentes
            </CardTitle>
            <CardDescription>
              Cadastros aguardando aprovação
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {pendingLoading ? (
                <div className="text-center py-4">
                  <p className="text-sm text-muted-foreground">Carregando pré-registros...</p>
                </div>
              ) : pendingPreRegistrationsData.length === 0 ? (
                <div className="text-center py-4">
                  <p className="text-sm text-muted-foreground">Nenhum pré-registro pendente</p>
                </div>
              ) : (
                pendingPreRegistrationsData.map((item) => (
                  <div key={item.id} className="flex items-center justify-between p-3 rounded-lg border">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-yellow-100">
                        <Users className="h-4 w-4 text-yellow-600" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">{item.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {item.email} • {item.date}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {item.phone} • {item.type}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge variant="secondary" className="mb-2">
                        Pré-cadastro
                      </Badge>
                      <div className="flex gap-1 text-right">
                        {/* <Button size="sm" variant="ghost" className="text-xs px-2">
                          Rejeitar
                        </Button> */}
                        <Button onClick={() => navigate(`/admin/clients/${item.id}/view`, { state: { from: location } })} size="sm" variant="outline" className="text-xs px-2">
                          Visualizar
                        </Button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>  
      {/* Resumo das Entidades do Projeto */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {canShowPartners && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Handshake className="h-5 w-5" />
                Parceiros
              </CardTitle>
              <CardDescription>Gestão de parceiros comerciais</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold">
                    {partnersLoading ? "..." : stats.partnersCount}
                  </div>
                  <p className="text-xs text-muted-foreground">Total cadastrados</p>
                </div>
                <Button variant="outline" size="sm" asChild>
                  <Link to="/admin/partners">
                    Ver todos
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Clientes
            </CardTitle>
            <CardDescription>Total de clientes cadastrados</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold">
                  {clientsLoading ? "..." : stats.clientsCount}
                </div>
                <p className="text-xs text-muted-foreground">Total cadastrados</p>
              </div>
              <Button variant="outline" size="sm" asChild>
                <Link to="/admin/clients">
                  Ver todos
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
          {canShowPartners && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserCheck className="h-5 w-5" />
              Usuários
            </CardTitle>
            <CardDescription>Usuários do sistema</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold">
                  {usersLoading ? "..." : stats.usersCount}
                </div>
                <p className="text-xs text-muted-foreground">Usuários ativos</p>
              </div>
              <Button variant="outline" size="sm" asChild>
                <Link to="/admin/settings/users">
                  Gerenciar
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
          )}
      </div>    
    </div>
  );
}