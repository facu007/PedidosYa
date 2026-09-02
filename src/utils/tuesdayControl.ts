import type { Product } from '../services/db';

export interface TuesdayControlStatus {
  isLoaded: boolean;
  daysRemaining: number;
  label: string;
}

export const getTuesdayControlStatus = (product: Product): TuesdayControlStatus => {
  // If isChecked is explicitly false, it is pending verification.
  // Otherwise (true or undefined on legacy/new products), it is considered verified.
  const isLoaded = product.isChecked !== false;

  if (isLoaded) {
    const verifiedBy = product.checkedBy || product.addedBy;
    return {
      isLoaded: true,
      daysRemaining: 0,
      label: verifiedBy ? `Verificado (${verifiedBy})` : 'Verificado / Cargado',
    };
  } else {
    return {
      isLoaded: false,
      daysRemaining: 0,
      label: 'Pendiente de verificación',
    };
  }
};

