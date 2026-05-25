export type Category = 'cookies' | 'pastries' | 'breads';
export type PaymentMethod = 'cash' | 'credit_card';
export type PriorityLevel = 1 | 2 | 3;
export type OrderStatus = 'queued' | 'baking' | 'delivery' | 'canceled';
export type TaskStatus = 'queued' | 'baking' | 'done' | 'canceled';

export const BAKE_MINUTES_BY_CATEGORY: Record<Category, number> = {
  cookies: 5,
  pastries: 10,
  breads: 20,
};

export interface MenuItem {
  id: string;
  name: string;
  category: Category;
  price: number;
  active: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface OrderItemRequest {
  menuItemId: string;
  quantity: number;
}

export interface Task {
  id: string;
  orderId: string;
  menuItemId: string;
  menuItemName: string;
  category: Category;
  bakeMinutes: number;
  priorityLevel: PriorityLevel;
  sequence: number;
  status: TaskStatus;
  queuedAt: number;
  bakingStartedAt?: number;
  expectedDoneAt?: number;
  doneAt?: number;
  estimatedStartAt?: number;
  estimatedEndAt?: number;
  ovenId?: number;
  slotIndex?: number;
}

export interface Order {
  id: string;
  ticketNumber: number;
  status: OrderStatus;
  paymentMethod: PaymentMethod;
  priorityLevel: PriorityLevel;
  totalPrice: number;
  itemLines: Array<{
    menuItemId: string;
    quantity: number;
    unitPrice: number;
    lineTotal: number;
  }>;
  createdAt: number;
  updatedAt: number;
  estimatedReadyAt: number;
  deliveredAt?: number;
}

export interface OvenSlot {
  taskId: string | null;
}

export interface Oven {
  id: number;
  slots: OvenSlot[];
}

export interface PlaceOrderInput {
  items: OrderItemRequest[];
  paymentMethod: PaymentMethod;
  priorityLevel: PriorityLevel;
}

export type SocketLike = {
  readyState: number;
  send: (payload: string) => void;
};

export function isCategory(value: unknown): value is Category {
  return value === 'cookies' || value === 'pastries' || value === 'breads';
}

export function isPaymentMethod(value: unknown): value is PaymentMethod {
  return value === 'cash' || value === 'credit_card';
}

export function isPriorityLevel(value: unknown): value is PriorityLevel {
  return value === 1 || value === 2 || value === 3;
}
