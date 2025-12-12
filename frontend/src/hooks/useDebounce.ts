import { useDebounce as useDebounceLib } from 'use-debounce';

/**
 * Hook para debounce de valores
 * Utiliza a biblioteca use-debounce para implementar debounce
 * 
 * @param value - Valor a ser debounced
 * @param delay - Delay em milissegundos
 * @returns Valor debounced
 */
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue] = useDebounceLib(value, delay);
  return debouncedValue;
}

export default useDebounce;