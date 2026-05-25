import { describe, expect, it } from 'vitest';

import { isCategory, isPaymentMethod, isPriorityLevel } from './domain';

describe('domain type guards', () => {
  it('validates category values', () => {
    expect(isCategory('cookies')).toBe(true);
    expect(isCategory('cake')).toBe(false);
  });

  it('validates payment method values', () => {
    expect(isPaymentMethod('cash')).toBe(true);
    expect(isPaymentMethod('bitcoin')).toBe(false);
  });

  it('validates priority level values', () => {
    expect(isPriorityLevel(1)).toBe(true);
    expect(isPriorityLevel(4)).toBe(false);
  });
});
