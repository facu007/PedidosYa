import { startOfDay, addDays, getDay, differenceInCalendarDays, subDays, parseISO } from 'date-fns';
import type { Product } from '../services/db';

export const getMostRecentTuesday = (fromRefDate = new Date()): Date => {
  const refDate = startOfDay(fromRefDate);
  const currentDayOfWeek = getDay(refDate); // 0 = Sunday, 1 = Monday, 2 = Tuesday, ...
  
  let daysToSubtract = currentDayOfWeek - 2;
  if (daysToSubtract < 0) {
    daysToSubtract += 7; // Go back to last week's Tuesday
  }
  return subDays(refDate, daysToSubtract);
};

export const getNextTuesday = (fromRefDate = new Date()): Date => {
  const refDate = startOfDay(fromRefDate);
  const currentDayOfWeek = getDay(refDate);
  
  let daysToAdd = 2 - currentDayOfWeek;
  if (daysToAdd <= 0) {
    daysToAdd += 7; // Next Tuesday
  }
  return addDays(refDate, daysToAdd);
};

export interface TuesdayControlStatus {
  isLoaded: boolean;
  daysRemaining: number;
  label: string;
}

export const getTuesdayControlStatus = (product: Product, today = new Date()): TuesdayControlStatus => {
  const refDate = startOfDay(today);
  const mostRecentTuesday = getMostRecentTuesday(refDate);
  const nextTuesday = getNextTuesday(refDate);

  // Determine when the product was last updated or added
  let updateDate: Date;
  if (product.lastUpdated) {
    updateDate = typeof product.lastUpdated === 'string' ? parseISO(product.lastUpdated) : new Date(product.lastUpdated);
  } else {
    updateDate = typeof product.addedDate === 'string' ? parseISO(product.addedDate) : new Date(product.addedDate);
  }
  updateDate = startOfDay(updateDate);

  // Check if updateDate was on or after the most recent Tuesday
  const isLoaded = updateDate.getTime() >= mostRecentTuesday.getTime();
  const daysUntilNext = differenceInCalendarDays(nextTuesday, refDate);
  const currentDay = getDay(refDate);

  if (isLoaded) {
    return {
      isLoaded: true,
      daysRemaining: daysUntilNext,
      label: `Al día. Próximo control en ${daysUntilNext} ${daysUntilNext === 1 ? 'día' : 'días'}`,
    };
  } else {
    if (currentDay === 2) {
      return {
        isLoaded: false,
        daysRemaining: 0,
        label: '¡Controlar hoy!',
      };
    } else if (currentDay === 1) {
      return {
        isLoaded: false,
        daysRemaining: 1,
        label: 'Controlar mañana',
      };
    } else {
      // Show remaining days in current cycle to complete the control
      return {
        isLoaded: false,
        daysRemaining: daysUntilNext,
        label: `Pendiente (${daysUntilNext} ${daysUntilNext === 1 ? 'día' : 'días'} restante${daysUntilNext === 1 ? '' : 's'})`,
      };
    }
  }
};
