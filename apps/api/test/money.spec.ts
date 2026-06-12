import { toFils, fromFils, addMoney, applyRate } from '@sanad/shared';

describe('money helpers (integer fils, no floats)', () => {
  it('round-trips amounts', () => {
    expect(toFils('350.00')).toBe(35000);
    expect(toFils('0.05')).toBe(5);
    expect(toFils('100')).toBe(10000);
    expect(toFils('99.9')).toBe(9990);
    expect(fromFils(35000)).toBe('350.00');
    expect(fromFils(5)).toBe('0.05');
  });

  it('adds without floating point drift', () => {
    // classic float trap: 0.1 + 0.2
    expect(addMoney('0.10', '0.20')).toBe('0.30');
    expect(addMoney('250.00', '100.00', '17.50')).toBe('367.50');
  });

  it('applies VAT with half-up rounding', () => {
    expect(applyRate('350.00', '0.05')).toBe('17.50');
    expect(applyRate('0.10', '0.05')).toBe('0.01'); // 0.005 rounds up
  });

  it('rejects invalid input', () => {
    expect(() => toFils('12.345')).toThrow();
    expect(() => toFils('-5.00')).toThrow();
    expect(() => toFils('abc')).toThrow();
    expect(() => fromFils(10.5)).toThrow();
    expect(() => fromFils(-1)).toThrow();
  });
});
