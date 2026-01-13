import { useEffect, useState, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Calendar, ChevronDown } from "lucide-react";
import { getNumeroSemana, getSemanaPorNumero, getInicioFimMes, numeroDoMes, dataParaBR, ucwords } from "@/lib/qlib";

// Tipos para o componente
type PeriodType = 'semana' | 'mes' | 'ano';

interface Period {
  type: PeriodType;
  value: string;
  inicio: string | Date;
  fim: string | Date;
}

interface PeriodSelectorProps {
  selectedPeriod: string;
  c_year?: string;
  onPeriodChange: (period: Period) => void;
}

/**
 * Componente para seleção de períodos (semana, mês, ano)
 * Permite ao usuário selecionar diferentes tipos de períodos e visualizar as datas de início e fim
 */
export const PeriodSelector = ({ selectedPeriod, c_year, onPeriodChange }: PeriodSelectorProps) => {
  // Valores atuais
  const currentYear: number = new Date().getFullYear();
  const currentMonth: string = new Date().toLocaleString('default', { month: 'long' });
  const currentMonthNumber: number = new Date().getMonth() + 1;
  const currentWeek: number = getNumeroSemana();

  // Estados do componente
  const [year, setYear] = useState<number>(currentYear);
  const [week, setWeek] = useState<string>(currentWeek.toString());
  const [month, setMonth] = useState<string>(currentMonth);
  const [monthNumber, setMonthNumber] = useState<number>(currentMonthNumber);
  const [periodType, setPeriodType] = useState<PeriodType>('mes');
  const [showDropdown, setShowDropdown] = useState(false);
  const [inicio, setInicio] = useState<string | Date>('');
  const [fim, setFim] = useState<string | Date>('');
  const [labelDrop, setLabelDrop] = useState<string>(selectedPeriod);

  // Opções disponíveis para cada tipo de período
  const weeks = Array.from({ length: 52 }, (_, i) => `${i + 1}`);
  const months = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];
  const years = [year - 2, year - 1, year, year + 1, year + 2];

  /**
   * Retorna as opções disponíveis com base no tipo de período selecionado
   */
  const getCurrentOptions = useCallback(() => {
    switch (periodType) {
      case 'semana': return weeks;
      case 'mes': return months;
      case 'ano': return years;
      default: return months;
    }
  }, [periodType, weeks, months, years]);

  /**
   * Retorna o valor padrão com base no tipo de período selecionado
   */
  const getCurrentDefault = useCallback(() => {
    switch (periodType) {
      case 'semana': return currentWeek.toString();
      case 'mes': return currentMonth;
      case 'ano': return currentYear.toString();
      default: return currentMonth;
    }
  }, [periodType, currentWeek, currentMonth, currentYear]);

  /**
   * Atualiza as datas de início e fim com base no tipo de período e valor selecionado
   * @param type Tipo de período (semana, mês, ano)
   * @param value Valor selecionado
   * @param updateYear Se deve atualizar o ano (usado quando o tipo é 'ano')
   */
  const updateDateRange = useCallback((type: PeriodType, value: string | number, updateYear = false) => {
    switch (type) {
      case 'semana': {
        const { inicio, fim } = getSemanaPorNumero(Number(year), Number(value));
        const dt_inicio = inicio.toISOString().split("T")[0];
        const dt_fim = fim.toISOString().split("T")[0];
        // setLabelDrop(`Semana: ${value}`);
        console.log(`dt_inicio: ${dt_inicio},dt_fim: ${dt_fim} year: ${year} value: ${value}`);        
        setInicio(dt_inicio);
        setFim(dt_fim);
        break;
      }
      case 'mes': {
        const numMes = numeroDoMes(String(value));
        if (numMes) {
          const { inicioStr, fimStr } = getInicioFimMes(year, Number(numMes));
          setInicio(inicioStr);
          setFim(fimStr);
          setMonthNumber(Number(numMes));
        }
        break;
      }
      case 'ano': {
        const yearValue = Number(value);
        setInicio(`${yearValue}-01-01`);
        setFim(`${yearValue}-12-31`);
        if (updateYear) {
          setYear(yearValue);
        }
        break;
      }
    }
  }, [year]);

  // Inicializa o componente com valores padrão
  useEffect(() => {
    // Configura os valores iniciais com base no tipo de período padrão (mês)
    updateDateRange('mes', month);
    setLabelDrop(`Mês: ${ucwords(month)}`);
  }, [month, updateDateRange]);

  // Atualiza o callback sempre que mudar inicio/fim
  useEffect(() => {
    if (inicio && fim) {
      onPeriodChange({
        type: periodType,
        value: selectedPeriod || getCurrentDefault(),
        inicio,
        fim
      });
    }
  }, [inicio, fim]);

  /**
   * Manipula a mudança do tipo de período (semana, mês, ano)
   */
  // console.log('week', week);
  
  const handlePeriodTypeChange = useCallback((newType: PeriodType) => {
    setPeriodType(newType);
    // Atualiza o período com base no tipo selecionado
    switch (newType) {
      case 'semana':
        updateDateRange(newType, week);
        setLabelDrop(`Semana: ${week}`);
        break;
      case 'mes':
        updateDateRange(newType, month);
        setLabelDrop(`Mês: ${ucwords(month)}`);
        break;
      case 'ano':
        updateDateRange(newType, year);
        setLabelDrop(`Ano: ${year}`);
        break;
    }
  }, [week, month, year, updateDateRange]);
  /**
   * Manipula a seleção de um valor no dropdown
   * @param option Valor selecionado
   * @param type Tipo de período
   */
  const handleDropdownSelection = useCallback((option: string | number, type: PeriodType) => {
    const formattedValue = ucwords(String(option));
    const formattedType = ucwords(type);
    const labelText = `${formattedType}: ${formattedValue}`;
    
    // Atualiza o intervalo de datas com base no tipo e valor selecionado
    // Para o tipo 'ano', também atualiza o estado do ano
    updateDateRange(type, option, type === 'ano');
    
    // Atualiza o texto do dropdown
    setLabelDrop(labelText);
    
    // Fecha o dropdown após a seleção
    setShowDropdown(false);
    
    // Notifica o componente pai sobre a mudança
    onPeriodChange({
      type: type,
      value: String(option),
      inicio: String(inicio),
      fim: String(fim)
    });
  }, [updateDateRange, inicio, fim, onPeriodChange]);
  return (
    <Card className="p-4">
      {/* Cabeçalho do componente */}
      <div className="flex items-center gap-2 mb-3">
        <Calendar className="w-5 h-5 text-primary" />
        <h3 className="text-lg font-semibold text-foreground">Ano {year}</h3>        
      </div>

      {/* Botões de tipo de período */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        {['semana', 'mes', 'ano'].map((type) => (
          <button
            key={type}
            onClick={() => handlePeriodTypeChange(type as PeriodType)}
            className={`p-3 rounded-lg text-sm font-medium transition-colors ${
              periodType === type
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            }`}
          >
            {type.charAt(0).toUpperCase() + type.slice(1)}
          </button>
        ))}
      </div>

      {/* Dropdown de seleção */}
      <div className="relative">
        <button
          onClick={() => setShowDropdown(!showDropdown)}
          className="w-full p-3 bg-muted rounded-lg flex items-center justify-between text-sm font-medium text-foreground"
          aria-expanded={showDropdown}
          aria-haspopup="listbox"
        >
          <span>{labelDrop}</span>
          <ChevronDown 
            className={`w-4 h-4 transition-transform ${showDropdown ? 'rotate-180' : ''}`} 
            aria-hidden="true"
          />
        </button>

        {showDropdown && (
          <div 
            className="absolute top-full left-0 right-0 mt-1 bg-card border border-border rounded-lg shadow-lg z-10 max-h-40 overflow-y-auto"
            role="listbox"
          >
            {getCurrentOptions().map((option) => (
              <button
                key={option}
                onClick={() => handleDropdownSelection(option, periodType)}
                className="w-full p-3 text-left text-sm hover:bg-muted transition-colors"
                role="option"
                aria-selected={option === selectedPeriod}
              >
                {option}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Exibição do intervalo de datas */}
      <div className="flex mt-3 text-sm text-muted-foreground">
        <span>Início: {dataParaBR(String(inicio))} | Fim: {dataParaBR(String(fim))}</span>
      </div>
    </Card>
  );
};
