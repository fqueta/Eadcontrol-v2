import { FunnelRecord } from '@/types/pipelines';

export type FunnelEntityType = 'clientes' | 'matriculas';

/**
 * IFunnelEntityStrategy
 * pt-BR: Interface que define o contrato da estratégia de entidade para funis.
 * en-US: Interface defining the contract for funnel entity strategies.
 */
export interface IFunnelEntityStrategy {
  readonly entityType: FunnelEntityType;
  readonly label: string;
  readonly description: string;
  readonly supportsSituations: boolean;
  readonly badgeLabel: string;
  readonly badgeVariant: 'default' | 'secondary' | 'outline' | 'destructive';
  readonly placeValue: 'vendas' | 'atendimento';
  targetRoute(funnelId: string): string;
  matches(funnel: FunnelRecord): boolean;
}

/**
 * ClientFunnelStrategy
 * pt-BR: Estratégia para funis que organizam Clientes e Leads de Vendas.
 * en-US: Strategy for funnels organizing Clients and Sales Leads.
 */
export class ClientFunnelStrategy implements IFunnelEntityStrategy {
  readonly entityType: FunnelEntityType = 'clientes';
  readonly label = 'Clientes / Leads';
  readonly description = 'Organiza leads e clientes no Kanban de Vendas';
  readonly supportsSituations = false;
  readonly badgeLabel = 'Clientes';
  readonly badgeVariant: 'default' | 'secondary' | 'outline' | 'destructive' = 'default';
  readonly placeValue: 'vendas' | 'atendimento' = 'vendas';

  targetRoute(funnelId: string): string {
    return `/admin/customers/leads?funnel=${encodeURIComponent(funnelId)}`;
  }

  matches(funnel: FunnelRecord): boolean {
    if (funnel.settings?.entity_type) {
      return funnel.settings.entity_type === 'clientes';
    }
    // Fallback retrocompatível com a chave place antiga
    return funnel.settings?.place !== 'atendimento';
  }
}

/**
 * EnrollmentFunnelStrategy
 * pt-BR: Estratégia para funis que organizam Matrículas e Alunos (Suporte).
 * en-US: Strategy for funnels organizing Enrollments and Students (Support).
 */
export class EnrollmentFunnelStrategy implements IFunnelEntityStrategy {
  readonly entityType: FunnelEntityType = 'matriculas';
  readonly label = 'Matrículas / Alunos';
  readonly description = 'Organiza matrículas de alunos no Kanban de Suporte e Situações';
  readonly supportsSituations = true;
  readonly badgeLabel = 'Matrículas';
  readonly badgeVariant: 'default' | 'secondary' | 'outline' | 'destructive' = 'secondary';
  readonly placeValue: 'vendas' | 'atendimento' = 'atendimento';

  targetRoute(funnelId: string): string {
    return `/admin/support?funnel=${encodeURIComponent(funnelId)}`;
  }

  matches(funnel: FunnelRecord): boolean {
    if (funnel.settings?.entity_type) {
      return funnel.settings.entity_type === 'matriculas';
    }
    // Fallback retrocompatível com a chave place antiga
    return funnel.settings?.place === 'atendimento';
  }
}

/**
 * FunnelStrategyFactory
 * pt-BR: Fábrica para instanciar e resolver a estratégia correta de entidade do funil.
 * en-US: Factory to instantiate and resolve the correct funnel entity strategy.
 */
export class FunnelStrategyFactory {
  private static clientStrategy = new ClientFunnelStrategy();
  private static enrollmentStrategy = new EnrollmentFunnelStrategy();

  /**
   * getStrategy
   * pt-BR: Retorna a estratégia correspondente a um funil.
   * en-US: Returns the strategy corresponding to a funnel.
   */
  public static getStrategy(funnel?: FunnelRecord | null): IFunnelEntityStrategy {
    if (!funnel) return FunnelStrategyFactory.clientStrategy;
    if (FunnelStrategyFactory.enrollmentStrategy.matches(funnel)) {
      return FunnelStrategyFactory.enrollmentStrategy;
    }
    return FunnelStrategyFactory.clientStrategy;
  }

  /**
   * getStrategyByType
   * pt-BR: Retorna a estratégia pelo tipo explícito.
   * en-US: Returns strategy by explicit type.
   */
  public static getStrategyByType(type: FunnelEntityType): IFunnelEntityStrategy {
    if (type === 'matriculas') {
      return FunnelStrategyFactory.enrollmentStrategy;
    }
    return FunnelStrategyFactory.clientStrategy;
  }

  /**
   * getAllStrategies
   * pt-BR: Retorna a lista de todas as estratégias disponíveis.
   * en-US: Returns list of all available strategies.
   */
  public static getAllStrategies(): IFunnelEntityStrategy[] {
    return [
      FunnelStrategyFactory.clientStrategy,
      FunnelStrategyFactory.enrollmentStrategy,
    ];
  }

  /**
   * resolveEntityType
   * pt-BR: Converte/resolve o tipo de entidade de um funil de forma segura.
   * en-US: Safely resolves entity type of a funnel.
   */
  public static resolveEntityType(funnel?: FunnelRecord | null): FunnelEntityType {
    return FunnelStrategyFactory.getStrategy(funnel).entityType;
  }
}
