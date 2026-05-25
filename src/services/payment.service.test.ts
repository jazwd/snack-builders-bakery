import { describe, expect, it, vi } from 'vitest';

import {
  CashPaymentProcessor,
  CreditCardPaymentProcessor,
  PaymentService,
  type PaymentProcessor,
} from './payment.service';

describe('payment processors', () => {
  it('approves non-negative cash payments', async () => {
    const processor = new CashPaymentProcessor();

    const result = await processor.authorize(12.5, 'ord-1');

    expect(result).toEqual({ approved: true, transactionRef: 'cash-ord-1' });
  });

  it('rejects negative credit card amounts', async () => {
    const processor = new CreditCardPaymentProcessor();

    const result = await processor.authorize(-1, 'ord-2');

    expect(result).toEqual({ approved: false, transactionRef: 'cc-ord-2' });
  });
});

describe('PaymentService', () => {
  it('delegates authorization to the processor for the selected method', async () => {
    const authorize = vi.fn().mockResolvedValue({
      approved: true,
      transactionRef: 'cash-ord-3',
    });

    const mockProcessor: PaymentProcessor = {
      method: 'cash',
      authorize,
    };

    const service = new PaymentService([mockProcessor]);
    const result = await service.processPayment('cash', 9.99, 'ord-3');

    expect(authorize).toHaveBeenCalledWith(9.99, 'ord-3');
    expect(result.transactionRef).toBe('cash-ord-3');
  });

  it('throws for unsupported payment methods', async () => {
    const service = new PaymentService([]);

    await expect(service.processPayment('cash', 10, 'ord-4')).rejects.toThrow(
      'Unsupported payment method: cash',
    );
  });
});
