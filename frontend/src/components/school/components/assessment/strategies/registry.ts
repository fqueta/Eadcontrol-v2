import { QuestionStrategy } from '../types';
import { MultipleChoiceStrategy } from './MultipleChoiceStrategy';
import { TrueFalseStrategy } from './TrueFalseStrategy';

/**
 * QuestionStrategyRegistry (Strategy Pattern Registry)
 * pt-BR: Registro central de estratégias para tipos de questões avaliativas.
 *        Permite estender facilmente com novos tipos (dissertativa, associação, etc).
 * en-US: Central registry of strategies for question types.
 */
class QuestionStrategyRegistry {
  private strategies: Map<string, QuestionStrategy> = new Map();

  constructor() {
    this.register(MultipleChoiceStrategy);
    this.register(TrueFalseStrategy);
  }

  public register(strategy: QuestionStrategy): void {
    this.strategies.set(strategy.type, strategy);
  }

  public get(type: string): QuestionStrategy {
    const strategy = this.strategies.get(type);
    if (!strategy) {
      // Fallback seguro para Múltipla Escolha
      return MultipleChoiceStrategy;
    }
    return strategy;
  }

  public getAll(): QuestionStrategy[] {
    return Array.from(this.strategies.values());
  }
}

export const questionRegistry = new QuestionStrategyRegistry();

export const getQuestionStrategy = (type: string): QuestionStrategy => {
  return questionRegistry.get(type);
};

export const getAllQuestionStrategies = (): QuestionStrategy[] => {
  return questionRegistry.getAll();
};
