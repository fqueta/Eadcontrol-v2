import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Formata uma data para exibição no formato brasileiro
 */
export function formatDate(date: string | Date): string {
  if (!date) return '-';
  
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  if (isNaN(dateObj.getTime())) return '-';
  
  return dateObj.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

/**
 * Formata pontos como números inteiros com separadores de milhares
 */
export function formatPoints(points: number): string {
  if (typeof points !== 'number' || isNaN(points)) return '0';
  
  // Converte para inteiro e formata com separadores de milhares
  return Math.floor(points).toLocaleString('pt-BR');
}
