export type CurrencyCode = 'EUR' | 'GBP';

export type ThemeId = 'purple-green' | 'indigo-pink' | 'cyan-orange' | 'azure-blue' | 'green-teal';

export interface ThemeOption {
  id: ThemeId;
  name: string;
  primary: string;
  accent: string;
}

export const THEMES: ThemeOption[] = [
  { id: 'purple-green', name: 'Purple & Green', primary: '#7b1fa2', accent: '#69f0ae' },
  { id: 'indigo-pink', name: 'Indigo & Pink', primary: '#3f51b5', accent: '#ff4081' },
  { id: 'cyan-orange', name: 'Cyan & Orange', primary: '#00dddd', accent: '#ffb787' },
  { id: 'azure-blue', name: 'Azure Blue', primary: '#005cbb', accent: '#343dff' },
  { id: 'green-teal', name: 'Teal', primary: '#008080', accent: '#dcb8fe' },
];

export const CURRENCIES: { code: CurrencyCode; symbol: string; name: string }[] = [
  { code: 'EUR', symbol: '€', name: 'Euro' },
  { code: 'GBP', symbol: '£', name: 'British Pound' },
];

export function getCurrencySymbol(code?: string | null): string {
  if (!code) return '€';
  return CURRENCIES.find(c => c.code === code)?.symbol ?? code;
}
