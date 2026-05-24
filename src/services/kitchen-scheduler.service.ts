import {
  BAKE_MINUTES_BY_CATEGORY,
  type Category,
  type MenuItem,
  type Order,
  type PlaceOrderInput,
  type Task,
  type Oven,
} from '../models/domain';
import type { Clock } from '../utils/clock';
import { Mutex } from '../utils/mutex';
import { PaymentService } from './payment.service';

class TaskPriorityQueue {
  private heap: Task[] = [];

  enqueue(task: Task): void {
    this.heap.push(task);
    this.bubbleUp(this.heap.length - 1);
  }

  dequeue(): Task | undefined {
    if (this.heap.length === 0) {
      return undefined;
    }

    const top = this.heap[0];
    const end = this.heap.pop();

    if (end && this.heap.length > 0) {
      this.heap[0] = end;
      this.bubbleDown(0);
    }

    return top;
  }

  snapshotSorted(): Task[] {
    return [...this.heap].sort((a, b) => this.compare(a, b));
  }

  private compare(a: Task, b: Task): number {
    if (a.priorityLevel !== b.priorityLevel) {
      return a.priorityLevel - b.priorityLevel;
    }
    return a.sequence - b.sequence;
  }

  private bubbleUp(index: number): void {
    let currentIndex = index;
    while (currentIndex > 0) {
      const parentIndex = Math.floor((currentIndex - 1) / 2);
      if (this.compare(this.heap[currentIndex], this.heap[parentIndex]) >= 0) {
        break;
      }

      [this.heap[currentIndex], this.heap[parentIndex]] = [
        this.heap[parentIndex],
        this.heap[currentIndex],
      ];
      currentIndex = parentIndex;
    }
  }

  private bubbleDown(index: number): void {
    let currentIndex = index;

    while (true) {
      const left = currentIndex * 2 + 1;
      const right = currentIndex * 2 + 2;
      let smallest = currentIndex;

      if (
        left < this.heap.length &&
        this.compare(this.heap[left], this.heap[smallest]) < 0
      ) {
        smallest = left;
      }

      if (
        right < this.heap.length &&
        this.compare(this.heap[right], this.heap[smallest]) < 0
      ) {
        smallest = right;
      }

      if (smallest === currentIndex) {
        break;
      }

      [this.heap[currentIndex], this.heap[smallest]] = [
        this.heap[smallest],
        this.heap[currentIndex],
      ];
      currentIndex = smallest;
    }
  }
}

export class KitchenScheduler {
  private readonly menu = new Map<string, MenuItem>();
  private readonly orders = new Map<string, Order>();
  private readonly tasks = new Map<string, Task>();
  private readonly queue = new TaskPriorityQueue();
  private readonly ovens: Oven[];
  private readonly taskTimers = new Map<string, NodeJS.Timeout>();
  private readonly mutex = new Mutex();
  private readonly minuteDurationMs: number;
  private ticketCounter = 1000;
  private sequenceCounter = 0;

  constructor(
    private readonly clock: Clock,
    private readonly paymentService: PaymentService,
    private readonly onOrderChanged: (order: Order) => void,
    ovenCount = 2,
    slotsPerOven = 3
  ) {
    this.minuteDurationMs = Number(
      process.env.BAKE_TIME_SCALE_MS_PER_MIN ?? '1000'
    );
    this.ovens = Array.from({ length: ovenCount }, (_, ovenIndex) => ({
      id: ovenIndex + 1,
      slots: Array.from({ length: slotsPerOven }, () => ({ taskId: null })),
    }));

    this.seedMenu();
  }

  private seedMenu(): void {
    const now = this.clock.now();

    const defaults: Array<Omit<MenuItem, 'id' | 'createdAt' | 'updatedAt'>> = [
      {
        name: 'Classic Chocolate Cookie',
        category: 'cookies',
        price: 2.5,
        active: true,
      },
      {
        name: 'Butter Croissant',
        category: 'pastries',
        price: 4.25,
        active: true,
      },
      { name: 'Sourdough Loaf', category: 'breads', price: 6.75, active: true },
    ];

    for (const item of defaults) {
      const id = this.createId('menu');
      this.menu.set(id, {
        ...item,
        id,
        createdAt: now,
        updatedAt: now,
      });
    }
  }

  listMenu(): MenuItem[] {
    return [...this.menu.values()].sort((a, b) => a.name.localeCompare(b.name));
  }

  createMenuItem(input: {
    name: string;
    category: Category;
    price: number;
  }): MenuItem {
    const now = this.clock.now();
    const menuItem: MenuItem = {
      id: this.createId('menu'),
      name: input.name,
      category: input.category,
      price: input.price,
      active: true,
      createdAt: now,
      updatedAt: now,
    };
    this.menu.set(menuItem.id, menuItem);
    return menuItem;
  }

  updateMenuItem(
    id: string,
    input: Partial<{
      name: string;
      category: Category;
      price: number;
      active: boolean;
    }>
  ): MenuItem {
    const existing = this.menu.get(id);
    if (!existing) {
      throw new Error('Menu item not found');
    }

    const updated: MenuItem = {
      ...existing,
      ...input,
      updatedAt: this.clock.now(),
    };

    this.menu.set(id, updated);
    return updated;
  }

  removeMenuItem(id: string): void {
    if (!this.menu.has(id)) {
      throw new Error('Menu item not found');
    }
    this.menu.delete(id);
  }

  async placeOrder(input: PlaceOrderInput): Promise<Order> {
    return this.mutex.runExclusive(async () => {
      if (input.items.length === 0) {
        throw new Error('Order must include at least one item');
      }

      const now = this.clock.now();
      const orderId = this.createId('ord');
      const taskIds: string[] = [];
      let totalPrice = 0;
      const itemLines: Order['itemLines'] = [];

      for (const requestItem of input.items) {
        if (requestItem.quantity < 1) {
          throw new Error('Quantity must be at least 1');
        }

        const menuItem = this.menu.get(requestItem.menuItemId);
        if (!menuItem || !menuItem.active) {
          throw new Error(`Menu item unavailable: ${requestItem.menuItemId}`);
        }

        const lineTotal = menuItem.price * requestItem.quantity;
        totalPrice += lineTotal;
        itemLines.push({
          menuItemId: menuItem.id,
          quantity: requestItem.quantity,
          unitPrice: menuItem.price,
          lineTotal,
        });

        for (let i = 0; i < requestItem.quantity; i += 1) {
          const task: Task = {
            id: this.createId('tsk'),
            orderId,
            menuItemId: menuItem.id,
            menuItemName: menuItem.name,
            category: menuItem.category,
            bakeMinutes: BAKE_MINUTES_BY_CATEGORY[menuItem.category],
            priorityLevel: input.priorityLevel,
            sequence: this.sequenceCounter++,
            status: 'queued',
            queuedAt: now,
          };

          this.tasks.set(task.id, task);
          this.queue.enqueue(task);
          taskIds.push(task.id);
        }
      }

      const paymentResult = await this.paymentService.processPayment(
        input.paymentMethod,
        totalPrice,
        orderId
      );
      if (!paymentResult.approved) {
        throw new Error('Payment was declined');
      }

      const order: Order = {
        id: orderId,
        ticketNumber: this.ticketCounter++,
        status: 'queued',
        paymentMethod: input.paymentMethod,
        priorityLevel: input.priorityLevel,
        totalPrice,
        itemLines,
        taskIds,
        createdAt: now,
        updatedAt: now,
        estimatedReadyAt: now,
      };

      this.orders.set(order.id, order);
      this.recalculateEstimatesAndStatuses();
      this.dispatchAvailableSlots();
      this.recalculateEstimatesAndStatuses();
      return this.mustGetOrder(order.id);
    });
  }

  getOrder(orderId: string): Order | undefined {
    return this.orders.get(orderId);
  }

  getKitchenSnapshot(): {
    ovens: Array<{
      ovenId: number;
      slots: Array<{ slotIndex: number; task: null | Record<string, unknown> }>;
    }>;
    waitingQueue: Array<Record<string, unknown>>;
  } {
    const ovens = this.ovens.map((oven) => ({
      ovenId: oven.id,
      slots: oven.slots.map((slot, index) => {
        if (!slot.taskId) {
          return { slotIndex: index + 1, task: null };
        }

        const task = this.tasks.get(slot.taskId);
        return {
          slotIndex: index + 1,
          task: task
            ? {
                taskId: task.id,
                orderId: task.orderId,
                item: task.menuItemName,
                category: task.category,
                priorityLevel: task.priorityLevel,
                bakingStartedAt: this.toIso(task.bakingStartedAt),
                expectedDoneAt: this.toIso(task.expectedDoneAt),
              }
            : null,
        };
      }),
    }));

    const waitingQueue = this.queue.snapshotSorted().map((task) => ({
      taskId: task.id,
      orderId: task.orderId,
      item: task.menuItemName,
      category: task.category,
      priorityLevel: task.priorityLevel,
      estimatedStartAt: this.toIso(task.estimatedStartAt),
      estimatedEndAt: this.toIso(task.estimatedEndAt),
    }));

    return { ovens, waitingQueue };
  }

  private dispatchAvailableSlots(): void {
    while (true) {
      const freeSlot = this.findFirstFreeSlot();
      if (!freeSlot) {
        return;
      }

      const task = this.queue.dequeue();
      if (!task) {
        return;
      }

      const now = this.clock.now();
      task.status = 'baking';
      task.bakingStartedAt = now;
      task.expectedDoneAt = now + task.bakeMinutes * this.minuteDurationMs;
      task.ovenId = freeSlot.oven.id;
      task.slotIndex = freeSlot.slotIndex;
      freeSlot.oven.slots[freeSlot.slotIndex].taskId = task.id;

      const timeout = this.clock.setTimeout(() => {
        void this.finishTask(task.id);
      }, task.bakeMinutes * this.minuteDurationMs);

      this.taskTimers.set(task.id, timeout);
    }
  }

  private async finishTask(taskId: string): Promise<void> {
    await this.mutex.runExclusive(async () => {
      const task = this.tasks.get(taskId);
      if (!task || task.status !== 'baking') {
        return;
      }

      const timer = this.taskTimers.get(taskId);
      if (timer) {
        this.clock.clearTimeout(timer);
        this.taskTimers.delete(taskId);
      }

      if (
        typeof task.ovenId === 'number' &&
        typeof task.slotIndex === 'number'
      ) {
        const oven = this.ovens.find(
          (candidate) => candidate.id === task.ovenId
        );
        if (oven) {
          oven.slots[task.slotIndex].taskId = null;
        }
      }

      task.status = 'done';
      task.doneAt = this.clock.now();
      task.ovenId = undefined;
      task.slotIndex = undefined;

      this.recalculateEstimatesAndStatuses();
      this.dispatchAvailableSlots();
      this.recalculateEstimatesAndStatuses();
    });
  }

  private findFirstFreeSlot(): { oven: Oven; slotIndex: number } | undefined {
    for (const oven of this.ovens) {
      for (let i = 0; i < oven.slots.length; i += 1) {
        if (!oven.slots[i].taskId) {
          return { oven, slotIndex: i };
        }
      }
    }

    return undefined;
  }

  private recalculateEstimatesAndStatuses(): void {
    const now = this.clock.now();

    const slotAvailableAt: number[] = [];
    for (const oven of this.ovens) {
      for (const slot of oven.slots) {
        if (!slot.taskId) {
          slotAvailableAt.push(now);
          continue;
        }

        const activeTask = this.tasks.get(slot.taskId);
        slotAvailableAt.push(activeTask?.expectedDoneAt ?? now);
      }
    }

    for (const task of this.tasks.values()) {
      if (task.status === 'baking') {
        task.estimatedStartAt = task.bakingStartedAt;
        task.estimatedEndAt = task.expectedDoneAt;
      }

      if (task.status === 'done') {
        task.estimatedStartAt = task.doneAt;
        task.estimatedEndAt = task.doneAt;
      }
    }

    const queuedTasks = this.queue.snapshotSorted();
    for (const task of queuedTasks) {
      const targetSlotIndex = this.findLeastBusySlot(slotAvailableAt);
      const estimatedStartAt = slotAvailableAt[targetSlotIndex];
      const estimatedEndAt =
        estimatedStartAt + task.bakeMinutes * this.minuteDurationMs;
      slotAvailableAt[targetSlotIndex] = estimatedEndAt;
      task.estimatedStartAt = estimatedStartAt;
      task.estimatedEndAt = estimatedEndAt;
    }

    for (const order of this.orders.values()) {
      const orderTasks = order.taskIds
        .map((taskId) => this.tasks.get(taskId))
        .filter((task): task is Task => Boolean(task));

      const allDone = orderTasks.every((task) => task.status === 'done');
      const anyBaking = orderTasks.some((task) => task.status === 'baking');

      if (allDone) {
        order.status = 'delivery';
        const deliveredAt = Math.max(
          ...orderTasks.map((task) => task.doneAt ?? now)
        );
        order.deliveredAt = deliveredAt;
        order.estimatedReadyAt = deliveredAt;
      } else if (anyBaking) {
        order.status = 'baking';
        order.estimatedReadyAt = Math.max(
          ...orderTasks.map((task) => task.estimatedEndAt ?? now)
        );
      } else {
        order.status = 'queued';
        order.estimatedReadyAt = Math.max(
          ...orderTasks.map((task) => task.estimatedEndAt ?? now)
        );
      }

      order.updatedAt = now;
      this.onOrderChanged(order);
    }
  }

  private findLeastBusySlot(slotAvailableAt: number[]): number {
    let minIndex = 0;
    for (let i = 1; i < slotAvailableAt.length; i += 1) {
      if (slotAvailableAt[i] < slotAvailableAt[minIndex]) {
        minIndex = i;
      }
    }
    return minIndex;
  }

  private mustGetOrder(orderId: string): Order {
    const order = this.orders.get(orderId);
    if (!order) {
      throw new Error(`Order not found: ${orderId}`);
    }
    return order;
  }

  private toIso(value: number | undefined): string | null {
    if (!value) {
      return null;
    }
    return new Date(value).toISOString();
  }

  private createId(prefix: string): string {
    return `${prefix}_${Math.random().toString(36).slice(2, 10)}${Date.now()
      .toString(36)
      .slice(-4)}`;
  }
}
