export type SectorType = 'snack' | 'kiosco' | 'desayuno' | 'almacen' | 'galletas' | 'heladeras' | 'freezers';

export interface SectorConfig {
  id: SectorType;
  label: string;
  icon: string;
  color: string;
  badgeBg: string;
  badgeText: string;
  border: string;
}

export const SECTORS: SectorConfig[] = [
  {
    id: 'snack',
    label: 'Snack',
    icon: '🍿',
    color: 'text-amber-600 dark:text-amber-400',
    badgeBg: 'bg-amber-100 dark:bg-amber-500/20',
    badgeText: 'text-amber-800 dark:text-amber-300',
    border: 'border-amber-300 dark:border-amber-700',
  },
  {
    id: 'kiosco',
    label: 'Kiosco',
    icon: '🍬',
    color: 'text-fuchsia-600 dark:text-fuchsia-400',
    badgeBg: 'bg-fuchsia-100 dark:bg-fuchsia-500/20',
    badgeText: 'text-fuchsia-800 dark:text-fuchsia-300',
    border: 'border-fuchsia-300 dark:border-fuchsia-700',
  },
  {
    id: 'desayuno',
    label: 'Desayuno',
    icon: '☕',
    color: 'text-orange-600 dark:text-orange-400',
    badgeBg: 'bg-orange-100 dark:bg-orange-500/20',
    badgeText: 'text-orange-800 dark:text-orange-300',
    border: 'border-orange-300 dark:border-orange-700',
  },
  {
    id: 'almacen',
    label: 'Almacén',
    icon: '🥫',
    color: 'text-emerald-600 dark:text-emerald-400',
    badgeBg: 'bg-emerald-100 dark:bg-emerald-500/20',
    badgeText: 'text-emerald-800 dark:text-emerald-300',
    border: 'border-emerald-300 dark:border-emerald-700',
  },
  {
    id: 'galletas',
    label: 'Galletas',
    icon: '🍪',
    color: 'text-yellow-600 dark:text-yellow-400',
    badgeBg: 'bg-yellow-100 dark:bg-yellow-500/20',
    badgeText: 'text-yellow-800 dark:text-yellow-300',
    border: 'border-yellow-300 dark:border-yellow-700',
  },
  {
    id: 'heladeras',
    label: 'Heladeras',
    icon: '🥛',
    color: 'text-cyan-600 dark:text-cyan-400',
    badgeBg: 'bg-cyan-100 dark:bg-cyan-500/20',
    badgeText: 'text-cyan-800 dark:text-cyan-300',
    border: 'border-cyan-300 dark:border-cyan-700',
  },
  {
    id: 'freezers',
    label: 'Freezers',
    icon: '🧊',
    color: 'text-blue-600 dark:text-blue-400',
    badgeBg: 'bg-blue-100 dark:bg-blue-500/20',
    badgeText: 'text-blue-800 dark:text-blue-300',
    border: 'border-blue-300 dark:border-blue-700',
  },
];

export const getSectorConfig = (sector?: string): SectorConfig | undefined => {
  if (!sector) return undefined;
  const normalized = sector.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
  return SECTORS.find((s) => s.id === normalized || s.label.toLowerCase() === normalized);
};

export const formatSectorLabel = (sector?: string): string => {
  const config = getSectorConfig(sector);
  return config ? `${config.icon} ${config.label}` : sector || 'Sin Sector';
};
