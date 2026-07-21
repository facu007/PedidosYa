import { differenceInCalendarDays, startOfDay } from 'date-fns';

export interface DiscountInfo {
  percentage: number;
  label: string;
  badgeClass: string;
  isDiscounted: boolean;
  savingsPerUnit?: number;
}

export const calculateSuggestedDiscount = (
  expiryDateStr: string,
  costPrice?: number
): DiscountInfo => {
  if (!expiryDateStr) {
    return { percentage: 0, label: 'Sin Descuento', badgeClass: '', isDiscounted: false };
  }

  const today = startOfDay(new Date());
  const expiry = startOfDay(new Date(expiryDateStr + 'T00:00:00'));
  const diffDays = differenceInCalendarDays(expiry, today);

  let percentage = 0;
  let badgeClass = '';

  if (diffDays < 0) {
    // Already expired -> 100% waste
    percentage = 100;
    badgeClass = 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400 border-red-300';
  } else if (diffDays <= 1) {
    // Vence hoy o mañana (3er Martes / Crítico) -> 70% OFF
    percentage = 70;
    badgeClass = 'bg-red-500 text-white font-extrabold shadow-sm';
  } else if (diffDays <= 3) {
    // Vence en 2-3 días -> 60% OFF
    percentage = 60;
    badgeClass = 'bg-orange-500 text-white font-bold shadow-sm';
  } else if (diffDays <= 7) {
    // Vence en 1 semana (2do Martes) -> 40% OFF
    percentage = 40;
    badgeClass = 'bg-amber-500 text-white font-bold shadow-sm';
  } else if (diffDays <= 14) {
    // Vence en 2 semanas (1er Martes de Alerta) -> 20% OFF
    percentage = 20;
    badgeClass = 'bg-yellow-100 text-yellow-800 dark:bg-yellow-500/20 dark:text-yellow-400 border-yellow-300';
  } else {
    // Normal / Vigente lejano -> 0%
    percentage = 0;
    badgeClass = 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300';
  }

  const isDiscounted = percentage > 0 && percentage < 100;
  const savingsPerUnit = costPrice && isDiscounted ? (costPrice * percentage) / 100 : undefined;

  const label = percentage === 100
    ? '🔴 100% MERMA'
    : percentage > 0
    ? `🏷️ ${percentage}% OFF`
    : 'Precio Regular';

  return {
    percentage,
    label,
    badgeClass,
    isDiscounted,
    savingsPerUnit,
  };
};
