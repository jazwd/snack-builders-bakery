import type { PaymentMethod } from '../models/domain';

export interface PaymentProcessor {
  method: PaymentMethod;
  authorize(
    amount: number,
    orderId: string
  ): Promise<{ approved: boolean; transactionRef: string }>;
}

export class CashPaymentProcessor implements PaymentProcessor {
  method: PaymentMethod = 'cash';

  async authorize(
    amount: number,
    orderId: string
  ): Promise<{ approved: boolean; transactionRef: string }> {
    // TODO: Integrate with the real POS cash register settlement workflow.
    return {
      approved: amount >= 0,
      transactionRef: `cash-${orderId}`,
    };
  }
}

export class CreditCardPaymentProcessor implements PaymentProcessor {
  method: PaymentMethod = 'credit_card';

  async authorize(
    amount: number,
    orderId: string
  ): Promise<{ approved: boolean; transactionRef: string }> {
    // TODO: Integrate with the real credit card gateway.
    return {
      approved: amount >= 0,
      transactionRef: `cc-${orderId}`,
    };
  }
}

export class PaymentService {
  private readonly processors: Map<PaymentMethod, PaymentProcessor>;

  constructor(processors: PaymentProcessor[]) {
    this.processors = new Map(
      processors.map((processor) => [processor.method, processor])
    );
  }

  async processPayment(
    method: PaymentMethod,
    amount: number,
    orderId: string
  ): Promise<{ approved: boolean; transactionRef: string }> {
    const processor = this.processors.get(method);
    if (!processor) {
      throw new Error(`Unsupported payment method: ${method}`);
    }

    return processor.authorize(amount, orderId);
  }
}
