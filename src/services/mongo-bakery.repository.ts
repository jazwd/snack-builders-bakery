import {
  MongoServerError,
  type Db,
  type Document,
  type Filter,
  type OptionalId,
} from 'mongodb';
import type { MenuItem, Order, Task } from '../models/domain';
import type {
  PersistenceGateway,
  PersistenceSnapshot,
} from './persistence.types';

const MENU_COLLECTION = 'menu_items';
const ORDERS_COLLECTION = 'orders';
const TASKS_COLLECTION = 'tasks';

const numericBsonTypes = ['double', 'int', 'long', 'decimal'];

type MenuItemDoc = {
  _id: string;
  name: string;
  category: MenuItem['category'];
  price: number;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
};

type OrderDoc = {
  _id: string;
  ticketNumber: number;
  status: Order['status'];
  paymentMethod: Order['paymentMethod'];
  priorityLevel: Order['priorityLevel'];
  payment: {
    transactionRef: string;
    approved: boolean;
    provider: string;
  };
  totalPrice: number;
  itemLines: Array<{
    menuItemId: string;
    quantity: number;
    unitPrice: number;
    lineTotal: number;
  }>;
  taskIds: string[];
  estimatedReadyAt: Date;
  createdAt: Date;
  updatedAt: Date;
  deliveredAt?: Date;
};

type TaskDoc = {
  _id: string;
  orderId: string;
  menuItemId: string;
  menuItemName: string;
  category: Task['category'];
  bakeMinutes: number;
  priorityLevel: Task['priorityLevel'];
  sequence: number;
  status: Task['status'];
  queuedAt: Date;
  bakingStartedAt?: Date;
  expectedDoneAt?: Date;
  doneAt?: Date;
  estimatedStartAt?: Date;
  estimatedEndAt?: Date;
  ovenId?: number;
  slotIndex?: number;
};

function toDate(value: number | undefined): Date | undefined {
  if (!value) {
    return undefined;
  }
  return new Date(value);
}

function toMillis(value: Date | undefined): number | undefined {
  if (!value) {
    return undefined;
  }
  return value.getTime();
}

function toMenuDoc(item: MenuItem): MenuItemDoc {
  return {
    _id: item.id,
    name: item.name,
    category: item.category,
    price: item.price,
    active: item.active,
    createdAt: new Date(item.createdAt),
    updatedAt: new Date(item.updatedAt),
  };
}

function fromMenuDoc(doc: MenuItemDoc): MenuItem {
  const rawDoc = doc as unknown as Record<string, unknown>;
  return {
    id: String(rawDoc._id),
    name: doc.name,
    category: doc.category,
    price: doc.price,
    active: doc.active,
    createdAt: doc.createdAt.getTime(),
    updatedAt: doc.updatedAt.getTime(),
  };
}

function toOrderDoc(order: Order): OrderDoc {
  return {
    _id: order.id,
    ticketNumber: order.ticketNumber,
    status: order.status,
    paymentMethod: order.paymentMethod,
    priorityLevel: order.priorityLevel,
    payment: {
      transactionRef: `${order.paymentMethod === 'cash' ? 'cash' : 'cc'}-${
        order.id
      }`,
      approved: true,
      provider: order.paymentMethod === 'cash' ? 'pos' : 'stripe',
    },
    totalPrice: order.totalPrice,
    itemLines: order.itemLines,
    taskIds: order.taskIds,
    estimatedReadyAt: new Date(order.estimatedReadyAt),
    createdAt: new Date(order.createdAt),
    updatedAt: new Date(order.updatedAt),
    deliveredAt: toDate(order.deliveredAt),
  };
}

function fromOrderDoc(doc: OrderDoc): Order {
  const rawDoc = doc as unknown as Record<string, unknown>;
  const rawTaskIds = rawDoc.taskIds;
  const taskIds = Array.isArray(rawTaskIds)
    ? rawTaskIds.map((taskId) => String(taskId))
    : [];

  return {
    id: String(rawDoc._id),
    ticketNumber: doc.ticketNumber,
    status: doc.status,
    paymentMethod: doc.paymentMethod,
    priorityLevel: doc.priorityLevel,
    totalPrice: doc.totalPrice,
    itemLines: Array.isArray(doc.itemLines)
      ? doc.itemLines.map((line) => ({
          ...line,
          menuItemId: String(line.menuItemId),
        }))
      : [],
    taskIds,
    estimatedReadyAt: doc.estimatedReadyAt.getTime(),
    createdAt: doc.createdAt.getTime(),
    updatedAt: doc.updatedAt.getTime(),
    deliveredAt: toMillis(doc.deliveredAt),
  };
}

function toTaskDoc(task: Task): TaskDoc {
  return {
    _id: task.id,
    orderId: task.orderId,
    menuItemId: task.menuItemId,
    menuItemName: task.menuItemName,
    category: task.category,
    bakeMinutes: task.bakeMinutes,
    priorityLevel: task.priorityLevel,
    sequence: task.sequence,
    status: task.status,
    queuedAt: new Date(task.queuedAt),
    bakingStartedAt: toDate(task.bakingStartedAt),
    expectedDoneAt: toDate(task.expectedDoneAt),
    doneAt: toDate(task.doneAt),
    estimatedStartAt: toDate(task.estimatedStartAt),
    estimatedEndAt: toDate(task.estimatedEndAt),
    ovenId: task.ovenId,
    slotIndex: task.slotIndex,
  };
}

function fromTaskDoc(doc: TaskDoc): Task {
  const rawDoc = doc as unknown as Record<string, unknown>;

  return {
    id: String(rawDoc._id),
    orderId: String(rawDoc.orderId),
    menuItemId: String(rawDoc.menuItemId),
    menuItemName: doc.menuItemName,
    category: doc.category,
    bakeMinutes: doc.bakeMinutes,
    priorityLevel: doc.priorityLevel,
    sequence: doc.sequence,
    status: doc.status,
    queuedAt: doc.queuedAt.getTime(),
    bakingStartedAt: toMillis(doc.bakingStartedAt),
    expectedDoneAt: toMillis(doc.expectedDoneAt),
    doneAt: toMillis(doc.doneAt),
    estimatedStartAt: toMillis(doc.estimatedStartAt),
    estimatedEndAt: toMillis(doc.estimatedEndAt),
    ovenId: doc.ovenId,
    slotIndex: doc.slotIndex,
  };
}

export class MongoBakeryRepository implements PersistenceGateway {
  constructor(private readonly db: Db) {}

  async ensureSchemas(): Promise<void> {
    await this.ensureMenuCollection();
    await this.ensureOrdersCollection();
    await this.ensureTasksCollection();
    await this.ensureIndexes();
  }

  async loadSnapshot(): Promise<PersistenceSnapshot> {
    const [menuDocs, orderDocs, taskDocs] = await Promise.all([
      this.db.collection<MenuItemDoc>(MENU_COLLECTION).find({}).toArray(),
      this.db.collection<OrderDoc>(ORDERS_COLLECTION).find({}).toArray(),
      this.db.collection<TaskDoc>(TASKS_COLLECTION).find({}).toArray(),
    ]);

    return {
      menuItems: menuDocs.map(fromMenuDoc),
      orders: orderDocs.map(fromOrderDoc),
      tasks: taskDocs.map(fromTaskDoc),
    };
  }

  async saveMenuItem(item: MenuItem): Promise<void> {
    const doc = toMenuDoc(item);
    await this.db
      .collection<MenuItemDoc>(MENU_COLLECTION)
      .updateOne({ _id: doc._id }, { $set: doc }, { upsert: true });
  }

  async deleteMenuItem(id: string): Promise<void> {
    await this.db
      .collection<MenuItemDoc>(MENU_COLLECTION)
      .deleteOne({ _id: id });
  }

  async saveOrder(order: Order): Promise<void> {
    const doc = toOrderDoc(order);
    const { _id, ...updateFields } = doc;
    await this.db.collection<OrderDoc>(ORDERS_COLLECTION).updateOne(
      { ticketNumber: doc.ticketNumber },
      {
        $set: updateFields,
        $setOnInsert: { _id },
      },
      { upsert: true }
    );
  }

  async saveOrders(orders: Order[]): Promise<void> {
    if (orders.length === 0) {
      return;
    }

    await this.db.collection<OrderDoc>(ORDERS_COLLECTION).bulkWrite(
      orders.map((order) => {
        const doc = toOrderDoc(order);
        const { _id, ...updateFields } = doc;
        return {
          updateOne: {
            filter: { ticketNumber: doc.ticketNumber },
            update: {
              $set: updateFields,
              $setOnInsert: { _id },
            },
            upsert: true,
          },
        };
      })
    );
  }

  async saveTasks(tasks: Task[]): Promise<void> {
    if (tasks.length === 0) {
      return;
    }

    await this.db.collection<TaskDoc>(TASKS_COLLECTION).bulkWrite(
      tasks.map((task) => {
        const doc = toTaskDoc(task);
        return {
          updateOne: {
            filter: { _id: doc._id },
            update: { $set: doc },
            upsert: true,
          },
        };
      })
    );
  }

  async saveOrderWithTasks(order: Order, tasks: Task[]): Promise<void> {
    await this.saveOrder(order);
    await this.saveTasks(tasks);
  }

  private async ensureMenuCollection(): Promise<void> {
    const validator = {
      $jsonSchema: {
        bsonType: 'object',
        required: [
          '_id',
          'name',
          'category',
          'price',
          'active',
          'createdAt',
          'updatedAt',
        ],
        additionalProperties: true,
        properties: {
          _id: { bsonType: ['string', 'objectId'] },
          name: { bsonType: 'string', minLength: 1 },
          category: { enum: ['cookies', 'pastries', 'breads'] },
          price: { bsonType: numericBsonTypes, minimum: 0 },
          active: { bsonType: 'bool' },
          createdAt: { bsonType: 'date' },
          updatedAt: { bsonType: 'date' },
        },
      },
    };

    await this.createOrUpdateCollection(MENU_COLLECTION, validator);
  }

  private async ensureOrdersCollection(): Promise<void> {
    const validator = {
      $jsonSchema: {
        bsonType: 'object',
        required: [
          '_id',
          'ticketNumber',
          'status',
          'paymentMethod',
          'priorityLevel',
          'payment',
          'totalPrice',
          'itemLines',
          'taskIds',
          'estimatedReadyAt',
          'createdAt',
          'updatedAt',
        ],
        additionalProperties: true,
        properties: {
          _id: { bsonType: ['string', 'objectId'] },
          ticketNumber: { bsonType: ['int', 'long', 'double'], minimum: 1 },
          status: { enum: ['queued', 'baking', 'delivery'] },
          paymentMethod: { enum: ['cash', 'credit_card'] },
          priorityLevel: { enum: [1, 2, 3] },
          payment: {
            bsonType: 'object',
            required: ['transactionRef', 'approved', 'provider'],
            properties: {
              transactionRef: { bsonType: 'string' },
              approved: { bsonType: 'bool' },
              provider: { bsonType: 'string' },
            },
          },
          totalPrice: { bsonType: numericBsonTypes, minimum: 0 },
          itemLines: {
            bsonType: 'array',
            minItems: 1,
            items: {
              bsonType: 'object',
              required: ['menuItemId', 'quantity', 'unitPrice', 'lineTotal'],
              properties: {
                menuItemId: { bsonType: ['string', 'objectId'] },
                quantity: { bsonType: ['int', 'long', 'double'], minimum: 1 },
                unitPrice: { bsonType: numericBsonTypes, minimum: 0 },
                lineTotal: { bsonType: numericBsonTypes, minimum: 0 },
              },
            },
          },
          taskIds: {
            bsonType: 'array',
            minItems: 0,
            items: { bsonType: ['string', 'objectId'] },
          },
          estimatedReadyAt: { bsonType: 'date' },
          createdAt: { bsonType: 'date' },
          updatedAt: { bsonType: 'date' },
          deliveredAt: { bsonType: ['date', 'null'] },
        },
      },
    };

    await this.createOrUpdateCollection(ORDERS_COLLECTION, validator);
  }

  private async ensureTasksCollection(): Promise<void> {
    const validator = {
      $jsonSchema: {
        bsonType: 'object',
        required: [
          '_id',
          'orderId',
          'menuItemId',
          'menuItemName',
          'category',
          'bakeMinutes',
          'priorityLevel',
          'sequence',
          'status',
          'queuedAt',
        ],
        additionalProperties: true,
        properties: {
          _id: { bsonType: ['string', 'objectId'] },
          orderId: { bsonType: ['string', 'objectId'] },
          menuItemId: { bsonType: ['string', 'objectId'] },
          menuItemName: { bsonType: 'string' },
          category: { enum: ['cookies', 'pastries', 'breads'] },
          bakeMinutes: { enum: [5, 10, 20] },
          priorityLevel: { enum: [1, 2, 3] },
          sequence: { bsonType: ['int', 'long', 'double'], minimum: 0 },
          status: { enum: ['queued', 'baking', 'done'] },
          queuedAt: { bsonType: 'date' },
          bakingStartedAt: { bsonType: ['date', 'null'] },
          expectedDoneAt: { bsonType: ['date', 'null'] },
          doneAt: { bsonType: ['date', 'null'] },
          estimatedStartAt: { bsonType: ['date', 'null'] },
          estimatedEndAt: { bsonType: ['date', 'null'] },
          ovenId: { bsonType: ['int', 'long', 'double', 'null'] },
          slotIndex: { bsonType: ['int', 'long', 'double', 'null'] },
        },
      },
    };

    await this.createOrUpdateCollection(TASKS_COLLECTION, validator);
  }

  private async ensureIndexes(): Promise<void> {
    await Promise.all([
      this.db
        .collection<MenuItemDoc>(MENU_COLLECTION)
        .createIndexes([{ key: { active: 1 } }, { key: { category: 1 } }]),
      this.db
        .collection<OrderDoc>(ORDERS_COLLECTION)
        .createIndexes([
          { key: { ticketNumber: 1 }, unique: true },
          { key: { status: 1, priorityLevel: 1, createdAt: 1 } },
          { key: { estimatedReadyAt: 1 } },
        ]),
      this.db
        .collection<TaskDoc>(TASKS_COLLECTION)
        .createIndexes([
          { key: { status: 1, priorityLevel: 1, sequence: 1 } },
          { key: { orderId: 1 } },
          { key: { expectedDoneAt: 1 } },
        ]),
    ]);
  }

  private async createOrUpdateCollection(
    name: string,
    validator: Document
  ): Promise<void> {
    try {
      await this.db.createCollection(name, {
        validator,
        validationLevel: 'strict',
        validationAction: 'error',
      });
      return;
    } catch (error) {
      if (
        !(error instanceof MongoServerError) ||
        error.codeName !== 'NamespaceExists'
      ) {
        throw error;
      }
    }

    await this.db.command({
      collMod: name,
      validator,
      validationLevel: 'strict',
      validationAction: 'error',
    });
  }
}
