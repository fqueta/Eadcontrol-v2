import { BaseApiService } from './BaseApiService';

/**
 * Interface para atividades recentes de clientes
 */
export interface ClientActivity {
  id: string;
  name: string;
  email: string | null;
  status: string;
  type: string;
  title: string;
  created_at: string;
  // Campos computados para compatibilidade
  client?: string;
  time?: string;
  cpf?: string;
  cnpj?: string;
}

/**
 * Interface para dados de cadastro de clientes por período
 */
export interface ClientRegistrationData {
  date: string;
  actived: number;
  inactived: number;
  pre_registred: number;
}

/**
 * Interface para pré-registros pendentes
 */
export interface PendingPreRegistration {
  id: string;
  name: string;
  email: string;
  phone: string;
  date: string;
  type: string;
}

/**
 * Interface para resposta da API do dashboard
 */
export interface DashboardApiResponse {
  success: boolean;
  data: {
    recentClientActivities: ClientActivity[];
    registration_data: ClientRegistrationData[];
    pendingPreRegistrations: PendingPreRegistration[];
    totals: {
      actived: number;
      inactived: number;
      pre_registred: number;
      variation_percentage: number;
    };
  };
}

/**
 * Interface para dados do dashboard
 */
export interface DashboardData {
  recentActivities: ClientActivity[];
  registrationData: ClientRegistrationData[];
  pendingPreRegistrations: PendingPreRegistration[];
  totals?: {
    actived: number;
    inactived: number;
    pre_registred: number;
    variation_percentage: number;
  };
}

/**
 * Serviço para dados do dashboard
 * Fornece endpoints para atividades recentes, dados de cadastro e pré-registros
 */
class DashboardService extends BaseApiService {
  private readonly endpoint = '/dashboard';

  /**
   * Obtém atividades recentes de clientes
   * @param limit - Número máximo de atividades a retornar
   */
  async getRecentActivities(limit: number = 10): Promise<ClientActivity[]> {
    try {
      const response = await this.get<DashboardApiResponse>(this.endpoint);
      if (response.success && response.data.recent_activities) {
        return this.transformActivities(response.data.recent_activities.slice(0, limit));
      }
      console.log('recentClientActivities:', response.data);
      return this.getMockRecentActivities();
    } catch (error) {
      // Se for erro 403, propagar o erro para o componente
      if ((error as any)?.status === 403) {
        throw error;
      }
      console.warn('Erro ao buscar atividades recentes, usando dados mock:', error);
      return this.getMockRecentActivities();
    }
  }

  /**
   * Obtém dados de cadastro de clientes por período
   * @param startDate - Data de início
   * @param endDate - Data de fim
   */
  async getRegistrationData(startDate?: string, endDate?: string): Promise<ClientRegistrationData[]> {
    try {
      const response = await this.get<DashboardApiResponse>(this.endpoint);
      // console.log('clientRegistrationData.....:', response.data);
      if (response.success && response.data.registration_data) {
        return response.data.registration_data;
      }
      // return this.getMockRegistrationData();
    } catch (error) {
      // Se for erro 403, propagar o erro para o componente
      if ((error as any)?.status === 403) {
        throw error;
      }
      console.warn('Erro ao buscar dados de cadastro, usando dados mock:', error);
      // return this.getMockRegistrationData();
    }
  }

  /**
   * Obtém pré-registros pendentes
   * @param limit - Número máximo de pré-registros a retornar
   */
  async getPendingPreRegistrations(limit: number = 10): Promise<PendingPreRegistration[]> {
    try {
      const response = await this.get<DashboardApiResponse>(this.endpoint);
      console.log('pendingPreRegistrations:', response.data);
      if (response.success && response.data?.pending_pre_registrations) {
        return response.data.pending_pre_registrations.slice(0, limit);
      }
      return this.getMockPendingPreRegistrations();
    } catch (error) {
      // Se for erro 403, propagar o erro para o componente
      if ((error as any)?.status === 403) {
        throw error;
      }
      console.warn('Erro ao buscar pré-registros pendentes, usando dados mock:', error);
      return this.getMockPendingPreRegistrations();
    }
  }

  /**
   * Obtém todos os dados do dashboard
   */
  async getDashboardData(): Promise<DashboardData> {
    try {
      const response = await this.get<DashboardApiResponse>(this.endpoint);
      if (response.success && response.data) {
        return {
          recentActivities: this.transformActivities(response.data.recentClientActivities || []),
          registrationData: response.data.clientRegistrationData || [],
          pendingPreRegistrations: response.data.pendingPreRegistrations || [],
          totals: response.data.totals
        };
      }
      return this.getMockDashboardData();
    } catch (error) {
      console.warn('Erro ao buscar dados do dashboard, usando dados mock:', error);
      return this.getMockDashboardData();
    }
  }

  /**
   * Transforma atividades da API para o formato esperado pelo componente
   */
  private transformActivities(activities: ClientActivity[]): ClientActivity[] {
    return activities.map(activity => ({
      ...activity,
      client: activity.name,
      time: this.formatTimeAgo(activity.created_at),
      // Extrai CPF/CNPJ do nome se disponível
      cpf: this.extractCpfFromName(activity.name),
      cnpj: this.extractCnpjFromName(activity.name)
    }));
  }

  /**
   * Formata data para "tempo atrás"
   */
  private formatTimeAgo(dateString: string): string {
    try {
      const [datePart, timePart] = dateString.split(' ');
      const [day, month, year] = datePart.split('/');
      const [hour, minute] = timePart.split(':');
      
      const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day), parseInt(hour), parseInt(minute));
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      const diffDays = Math.floor(diffHours / 24);
      
      if (diffDays > 0) {
        return `${diffDays} dia${diffDays > 1 ? 's' : ''} atrás`;
      } else if (diffHours > 0) {
        return `${diffHours} hora${diffHours > 1 ? 's' : ''} atrás`;
      } else {
        return 'Agora mesmo';
      }
    } catch (error) {
      return dateString;
    }
  }

  /**
   * Extrai CPF do nome se presente
   */
  private extractCpfFromName(name: string): string | undefined {
    const cpfMatch = name.match(/\d{3}\.\d{3}\.\d{3}-\d{2}/);
    return cpfMatch ? cpfMatch[0] : undefined;
  }

  /**
   * Extrai CNPJ do nome se presente
   */
  private extractCnpjFromName(name: string): string | undefined {
    const cnpjMatch = name.match(/\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}/);
    return cnpjMatch ? cnpjMatch[0] : undefined;
  }

  /**
   * Dados mock para atividades recentes
   */
  private getMockRecentActivities(): ClientActivity[] {
    return [
      {
        id: 1,
        type: "client_registered",
        title: "Novo cliente cadastrado",
        client: "João Silva",
        status: "actived",
        time: "2 horas atrás",
        cpf: "123.456.789-00",
      },
      {
        id: 2,
        type: "client_pre_registered",
        title: "Pré-cadastro realizado",
        client: "Maria Santos",
        status: "pre_registred",
        time: "4 horas atrás",
        cpf: "987.654.321-00",
      },
      {
        id: 3,
        type: "client_activated",
        title: "Cliente ativado",
        client: "Empresa ABC Ltda",
        status: "actived",
        time: "1 dia atrás",
        cnpj: "12.345.678/0001-90",
      },
      {
        id: 4,
        type: "client_inactivated",
        title: "Cliente inativado",
        client: "Pedro Costa",
        status: "inactived",
        time: "2 dias atrás",
        cpf: "456.789.123-00",
      },
    ];
  }

  /**
   * Dados mock para cadastros por período
   */
  private getMockRegistrationData(): ClientRegistrationData[] {
    return [
      { date: "2025-09-16", actived: 1, inactived: 0, pre_registred: 0 },
      { date: "2025-09-17", actived: 1, inactived: 0, pre_registred: 0 },
      { date: "2025-09-18", actived: 0, inactived: 0, pre_registred: 0 },
      { date: "2025-09-19", actived: 0, inactived: 1, pre_registred: 0 },
      { date: "2025-09-20", actived: 0, inactived: 0, pre_registred: 0 },
      { date: "2025-09-21", actived: 0, inactived: 0, pre_registred: 0 },
      { date: "2025-09-22", actived: 0, inactived: 0, pre_registred: 0 },
      { date: "2025-09-23", actived: 0, inactived: 0, pre_registred: 0 },
      { date: "2025-09-24", actived: 0, inactived: 0, pre_registred: 0 },
      { date: "2025-09-25", actived: 0, inactived: 0, pre_registred: 0 },
      { date: "2025-09-26", actived: 0, inactived: 0, pre_registred: 0 },
      { date: "2025-09-27", actived: 0, inactived: 0, pre_registred: 0 },
      { date: "2025-09-28", actived: 0, inactived: 0, pre_registred: 0 },
      { date: "2025-09-29", actived: 3, inactived: 0, pre_registred: 0 },
    ];
  }

  /**
   * Dados mock para pré-registros pendentes
   */
  private getMockPendingPreRegistrations(): PendingPreRegistration[] {
    return [
      {
        id: 1,
        name: "Maria Santos",
        email: "maria.santos@email.com",
        phone: "(11) 99999-9999",
        date: "2024-01-21",
        type: "Pessoa Física"
      },
      {
        id: 2,
        name: "Empresa Tech Solutions Ltda",
        email: "contato@techsolutions.com",
        phone: "(11) 3333-4444",
        date: "2024-01-20",
        type: "Pessoa Jurídica"
      },
      {
        id: 3,
        name: "João Silva",
        email: "joao.silva@gmail.com",
        phone: "(11) 88888-7777",
        date: "2024-01-19",
        type: "Pessoa Física"
      },
    ];
  }

  /**
   * Dados mock completos do dashboard
   */
  private getMockDashboardData(): DashboardData {
    return {
      recentActivities: this.getMockRecentActivities(),
      registrationData: this.getMockRegistrationData(),
      pendingPreRegistrations: this.getMockPendingPreRegistrations()
    };
  }
}

export const dashboardService = new DashboardService();