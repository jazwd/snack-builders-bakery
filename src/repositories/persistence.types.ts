import type { MenuItem, Order, Task } from '../models/domain';

export type SequentialType = 'menu' | 'ord' | 'tsk';

export interface PersistenceSnapshot {
  menuItems: MenuItem[];
  orders: Order[];
  tasks: Task[];
}

export interface PersistenceGateway {
  ensureSchemas(): Promise<void>;
  nextId(type: SequentialType): Promise<string>;
  loadSnapshot(): Promise<PersistenceSnapshot>;
  saveMenuItem(item: MenuItem): Promise<void>;
  deleteMenuItem(id: string): Promise<void>;
  saveOrder(order: Order): Promise<void>;
  saveOrders(orders: Order[]): Promise<void>;
  saveTasks(tasks: Task[]): Promise<void>;
  saveOrderWithTasks(order: Order, tasks: Task[]): Promise<void>;
}
