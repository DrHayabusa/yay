/**
 * Money helpers. All arithmetic is done in integer fils (1 AED = 100 fils)
 * to avoid floating-point errors; values cross the wire as 2-decimal strings.
 */
export interface Money {
  /** Decimal string with exactly 2 fraction digits, e.g. "350.00". */
  amount: string;
  currency: 'AED';
}

const AMOUNT_RE = /^\d+(\.\d{1,2})?$/;

export function toFils(amount: string): number {
  if (!AMOUNT_RE.test(amount)) {
    throw new Error(`Invalid money amount: ${amount}`);
  }
  const [whole, frac = ''] = amount.split('.');
  return Number(whole) * 100 + Number(frac.padEnd(2, '0') || '0');
}

export function fromFils(fils: number): string {
  if (!Number.isInteger(fils) || fils < 0) {
    throw new Error(`Invalid fils value: ${fils}`);
  }
  const whole = Math.floor(fils / 100);
  const frac = String(fils % 100).padStart(2, '0');
  return `${whole}.${frac}`;
}

export function addMoney(...amounts: string[]): string {
  return fromFils(amounts.reduce((sum, a) => sum + toFils(a), 0));
}

/** rate as decimal string, e.g. "0.05" for 5% VAT. Rounds half-up to the fil. */
export function applyRate(amount: string, rate: string): string {
  const fils = toFils(amount);
  const rateBp = Math.round(Number(rate) * 10_000); // basis points
  return fromFils(Math.round((fils * rateBp) / 10_000));
}

export const UAE_VAT_RATE = '0.05';
