import { BaseApiService } from './BaseApiService';

/**
 * DashboardChartsService
 * pt-BR: Serviço dedicado para consumir o endpoint consolidado de resumo do Dashboard.
 * en-US: Dedicated service to consume the consolidated Dashboard summary endpoint.
 */
class DashboardChartsService extends BaseApiService {
  /**
   * getSummary
   * pt-BR: Obtém o payload único do resumo do dashboard em `/dashboard/summary`.
   *        Aceita `year` via querystring para gerar séries dinâmicas.
   *        Retorna arrays com pontos mensais para Interessados e Matriculados.
   * en-US: Fetches the single dashboard summary payload at `/dashboard/summary`.
   *        Accepts `year` via querystring to generate dynamic series.
   *        Returns arrays with monthly points for Interested and Enrolled.
   */
  async getSummary(params?: { year?: number }): Promise<{
    data: {
      charts: {
        interested: Array<{ mes: string; [key: string]: number }>;
        enrolled: Array<{ mes: string; [key: string]: number }>;
      };
    };
  }> {
    return this.get('/dashboard/summary', params);
  }
}

/**
 * Instância padrão exportada
 * pt-BR: Use `dashboardChartsService.getSummary()` para obter os dados dos gráficos.
 * en-US: Use `dashboardChartsService.getSummary()` to fetch charts data.
 */
export const dashboardChartsService = new DashboardChartsService();