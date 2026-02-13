/** Bank from the catalog (available to add). Logo shown when logoUrl is set. */
export interface BankCatalogItem {
  id: string;
  name: string;
  logoUrl?: string;
}

/** 10 Dutch banks for the add-bank dialog. Icons shown when available. */
export const DUTCH_BANKS: BankCatalogItem[] = [
  { id: 'ing', name: 'ING', logoUrl: 'assets/images/banks/ing.png' },
  { id: 'abnamro', name: 'ABN AMRO' },
  { id: 'rabobank', name: 'Rabobank' },
  { id: 'triodos', name: 'Triodos Bank' },
  { id: 'sns', name: 'SNS Bank' },
  { id: 'asn', name: 'ASN Bank' },
  { id: 'bunq', name: 'bunq' },
  { id: 'knab', name: 'Knab' },
  { id: 'regiobank', name: 'RegioBank' },
  { id: 'vanlanschot', name: 'Van Lanschot' },
];

export type CountryCode = 'NL' | 'GB';

export const COUNTRIES: { code: CountryCode; name: string }[] = [
  { code: 'NL', name: 'Nederland' },
  { code: 'GB', name: 'United Kingdom' },
];
