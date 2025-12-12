import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { CourseRecord, CourseModule } from '@/types/courses';

/**
 * SelectGeraValor
 * pt-BR: Componente de select que gera uma opção de valor com base nos módulos
 *        do curso selecionado. Renderiza opções quando o curso é do tipo "4".
 * en-US: Select component that generates a value option based on the selected
 *        course modules. Renders options when the course is of type "4".
 */
export interface SelectGeraValorProps {
  course?: CourseRecord | null;
  value?: string;
  onChange?: (val: string) => void;
  disabled?: boolean;
  /**
   * name
   * pt-BR: Nome do campo para submissão nativa de formulários (input hidden).
   * en-US: Field name for native form submission (hidden input).
   */
  name?: string;
}

/**
 * SelectGeraValor
 * pt-BR: Select que apresenta módulos do curso e gera um valor "preco::idx".
 *        Inclui um input hidden opcional com `name` para envio em formulários.
 * en-US: Select that presents course modules and generates a value "price::idx".
 *        Includes an optional hidden input with `name` for form submission.
 */
export function SelectGeraValor({ course, value, onChange, disabled, name }: SelectGeraValorProps) {
  /**
   * getModuleLabel
   * pt-BR: Monta o rótulo amigável para cada módulo (título • valor).
   * en-US: Builds a friendly label for each module (title • value).
   */
  const getModuleLabel = (m: CourseModule): string => {
    const title = m.titulo || 'Módulo';
    const v = (m.valor ?? '').toString().trim();
    const price = v ? `R$ ${v}` : 'Sem valor';
    return `${title} • ${price}`;
  };

  /**
   * getItemValue
   * pt-BR: Gera um valor único para cada opção do Select combinando preço e índice.
   *        O Radix Select requer valores únicos; se dois módulos tiverem o mesmo
   *        preço, usamos o índice para diferenciar (ex.: "23.820,00::1").
   * en-US: Generates a unique value for each Select option by combining price and
   *        index. Radix Select requires unique values; if two modules share the
   *        same price, we differentiate using the index (e.g., "23.820,00::1").
   */
  const getItemValue = (m: CourseModule, idx: number): string => {
    const v = (m.valor ?? '').toString().trim();
    const price = v.length > 0 ? v : '0';
    return `${price}::${idx}`;
  };

  const isTipo4 = (course?.tipo ?? '').toString() === '4';
  const modulos = Array.isArray(course?.modulos) ? course!.modulos : [];
  // Removido log de depuração para evitar ruído no console em produção
  return (
    <>
      {/*
       * HiddenInput
       * pt-BR: Garante que o valor seja enviado em submissões nativas (name/value).
       * en-US: Ensures the value is sent on native form submissions (name/value).
       */}
      {name ? <input type="hidden" name={name} value={value ?? ''} /> : null}
      <Select value={value ?? ''} onValueChange={onChange} disabled={disabled}>
        <SelectTrigger>
          <SelectValue placeholder="Gerar valor a partir dos módulos" />
        </SelectTrigger>
        <SelectContent>
          {isTipo4 && modulos.length > 0 ? (
            modulos.map((m, idx) => (
              <SelectItem key={`${course?.id || 'c'}-m${idx}`} value={getItemValue(m, idx)}>
                {getModuleLabel(m)}
              </SelectItem>
            ))
          ) : (
            <SelectItem value="__no_modules__" disabled>
              Nenhum módulo disponível para este curso
            </SelectItem>
          )}
        </SelectContent>
      </Select>
    </>
  );
}

export default SelectGeraValor;