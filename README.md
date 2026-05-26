# SNACK BUILDERS BAKERY

High-performance backend API for Snack Builders Bakery to handle order management, storefront operations, and a complex Priority-Based Kitchen Scheduler.

Our kitchen has 2 Ovens, each fitting 3 trays (Total capacity: 6 concurrent slots). The core challenge is managing a prioritized queue where VIP orders can affect the scheduling and estimations of all other active orders (**This can be handled by environment variables, the number of ovens, and their slots**).

### Core Requirements:

- Menu Management: Users must be able to see our menu, and store managers should be able to add, remove, or update the items that we offer.
- Order Placement: Customers need to be able to request one or multiple items. When an order is placed, the system must return a ticket to the customer with the price they need to pay. The customer should also have the ability to track the status of their order.
- Payment Management: We need to be able to handle payments from the clients, accepting both cash and credit cards.
- Bake Time Rules: Different snacks have different bake times:
    - Cookies: 5 minutes.
    - Pastries: 10 minutes.
    - Breads: 20 minutes.
- Capacity-Based Estimation: When an order is placed, you must give the user an estimated_ready_time calculated dynamically based on current oven capacity.
- Kitchen Monitoring: Provide our kitchen manager with complete visibility over the status of our kitchen, specifying which items are currently in which oven and which items are waiting in the queue to be baked.
- Priority Queuing: Every order must have an assigned priority_level:
    - Tier 1 (VIP): Highest priority.
    - Tier 2 (App/Delivery): Medium priority.
    - Tier 3 (Walk-in): Standard priority.

When an oven slot opens, the system must pick the highest-priority item from the queue first, subject to the following constraints:

- You cannot remove a lower-priority item from the oven once it has started baking.
- If a VIP order is placed, the estimated_ready_time for all lower-priority orders in the queue must be updated dynamically to reflect their new delayed position.

## Solution

- The infrastructure/runtime environment selected for this solution is **Node.js (TypeScript code)**.
- **Fastify** web framework as traffic controller and Backend translator (routing, request parsing, and responses), providing a low overhead and high performance.
- It uses a practical **MVC architecture**, with a Service + Repository layer added.
- **MongoDB** to handle the application's persistent data.
- **JWT(JSON Web Token)** as a security digital ID badge, and providing authentication to call the main API requests/endpoint (using a Token Barear authorization parameter).
- **Prometheus** client for Node.js, for handling metrics/monitoring.
- **Grafana** to expose/show metrics and system performance.
- **ESLint** as a spell-checker and code quality inspector in development and build (part of the Continuous integration workflow).
- **Unit Tests** through the _Vitest_ testing framework. It can be executed manually in development and is also part of the Continuous integration workflow.
- **GitHub** to handle the versioning of the code (including commits, PRs) and to handle the CI and deployment of the app (using **GitHub Actions**).
- **Docker Compose** for Orchestration (locally and in an **AWS EC2 instance** to test the endpoint in a Production environment).

## HOW TO USE IT (API endpoints)

Base host used in this guide:

- `http://ec2-18-217-126-148.us-east-2.compute.amazonaws.com`

### 1. Endpoints That Do **Not** Require Authentication

#### 1.1 Health Check

- Method: `GET`
- Relative path: `/api/health`
- Test URL: `http://ec2-18-217-126-148.us-east-2.compute.amazonaws.com/api/health`
- Purpose: Verify API and MongoDB readiness.

Example:

```bash
curl -X GET "http://ec2-18-217-126-148.us-east-2.compute.amazonaws.com/api/health"
```

Postman example:

- Method: `GET`
- URL: `http://ec2-18-217-126-148.us-east-2.compute.amazonaws.com/api/health`
- Auth: None

        <img width="1320" height="464" alt="Screenshot 2026-05-26 at 12 36 59 PM" src="https://github.com/user-attachments/assets/fa8e4ad8-3753-4de9-8057-b05e8e8ed152" />

Successful response example:

```json
{
    "status": "ok",
    "service": "snack-builder-bakery-api",
    "mongodb": "connected",
    "ready": true
}
```

#### 1.2 Prometheus Metrics

- Method: `GET`
- Relative path: `/metrics`
- Test URL: `http://ec2-18-217-126-148.us-east-2.compute.amazonaws.com/metrics`
- Purpose: Exposes Prometheus metrics (CPU, memory, process stats, etc.).
- Note: This endpoint is intentionally outside `/api`.

Example:

```bash
curl -X GET "http://ec2-18-217-126-148.us-east-2.compute.amazonaws.com/metrics"
```

Postman example:

- Method: `GET`
- URL: `http://ec2-18-217-126-148.us-east-2.compute.amazonaws.com/metrics`
- Auth: None

<img width="1317" height="823" alt="Screenshot 2026-05-26 at 12 40 48 PM" src="https://github.com/user-attachments/assets/9300a2ef-8a1c-47ac-add5-00c9eaa4749e" />

### 2. Authentication Endpoint

#### 2.1 Login (Get JWT Token)

- Method: `POST`
- Relative path: `/api/auth/login`
- Test URL: `http://ec2-18-217-126-148.us-east-2.compute.amazonaws.com/api/auth/login`
- Purpose: Authenticate using configured `AUTH_USERNAME` and `AUTH_PASSWORD` and receive JWT.

Request body:

```json
{
    "username": "admin",
    "password": "your_auth_password"
}
```

**Note:** If you will test the app locally, please set the corresponding username and password in the .env file variables: AUTH_USERNAME and AUTH_PASSWORD.
If you want to use the Test URL in the AWS EC2 instance, please contact me at [jose.zamora.78@gmail.com](mailto:jose.zamora.78@gmail.com) to provide you with the credentials.

Example:

```bash
curl -X POST "http://ec2-18-217-126-148.us-east-2.compute.amazonaws.com/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"your_auth_password"}'
```

Postman example:

- Method: `POST`
- URL: `http://ec2-18-217-126-148.us-east-2.compute.amazonaws.com/api/auth/login`
- Headers: `Content-Type: application/json`
- Body (raw JSON):

```json
{
    "username": "admin",
    "password": "your_auth_password"
}
```

Tip: save `token` from response and use `Authorization: Bearer <token>` for protected endpoints. The **Token expires** in 1 hour; after this, you have to generate a new one.

<img width="1319" height="466" alt="Screenshot 2026-05-26 at 12 43 39 PM" src="https://github.com/user-attachments/assets/d0b3b3a0-5c30-49fc-8bcf-1b463cda2ec8" />

Successful response example:

```json
{
    "message": "Login successful",
    "token": "<jwt_token>",
    "tokenType": "Bearer",
    "expiresIn": "1h"
}
```

Common errors:

- `400`: Username and password are required
- `401`: Invalid credentials
- `500`: JWT authentication is not configured correctly

### 3. Endpoints That **Require Authentication**

Use this header for all endpoints below:

```http
Authorization: Bearer <jwt_token>
```

#### 3.1 Menu - List

- Method: `GET`
- Relative path: `/api/menu`
- Test URL: `http://ec2-18-217-126-148.us-east-2.compute.amazonaws.com/api/menu`

Example:

```bash
curl -X GET "http://ec2-18-217-126-148.us-east-2.compute.amazonaws.com/api/menu" \
  -H "Authorization: Bearer <jwt_token>"
```

Postman example:

- Method: `GET`
- URL: `http://ec2-18-217-126-148.us-east-2.compute.amazonaws.com/api/menu`
- Auth: Bearer Token (`<jwt_token>`)

<img width="1316" height="564" alt="Screenshot 2026-05-26 at 12 52 32 PM" src="https://github.com/user-attachments/assets/0093d60a-c940-400a-9f59-aaf4dc0c72dc" />

#### 3.2 Menu - Create

- Method: `POST`
- Relative path: `/api/menu`
- Test URL: `http://ec2-18-217-126-148.us-east-2.compute.amazonaws.com/api/menu`

Request body:

```json
{
    "name": "Chocolate Cookie",
    "category": "cookies",
    "price": 2.5
}
```

Example:

```bash
curl -X POST "http://ec2-18-217-126-148.us-east-2.compute.amazonaws.com/api/menu" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <jwt_token>" \
  -d '{"name":"Chocolate Cookie","category":"cookies","price":2.5}'
```

Postman example:

- Method: `POST`
- URL: `http://ec2-18-217-126-148.us-east-2.compute.amazonaws.com/api/menu`
- Auth: Bearer Token (`<jwt_token>`)
- Headers: `Content-Type: application/json`
- Body (raw JSON):

```json
{
    "name": "Chocolate Cookie",
    "category": "cookies",
    "price": 2.5
}
```

<img width="1315" height="551" alt="Screenshot 2026-05-26 at 12 50 31 PM" src="https://github.com/user-attachments/assets/a2867d56-49a0-4a08-a81a-0431736c0cdb" />

Errors:

- `400`: Invalid payload (name/category/positive price required)

#### 3.3 Menu - Update

- Method: `PUT`
- Relative path: `/api/menu/:id`
- Test URL: `http://ec2-18-217-126-148.us-east-2.compute.amazonaws.com/api/menu/:id`

Request body (partial):

```json
{
    "name": "Updated Name",
    "category": "pastries",
    "price": 3.2,
    "active": true
}
```

Example:

```bash
curl -X PUT "http://ec2-18-217-126-148.us-east-2.compute.amazonaws.com/api/menu/<menu_id>" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <jwt_token>" \
  -d '{"price":3.2,"active":true}'
```

Postman example:

- Method: `PUT`
- URL: `http://ec2-18-217-126-148.us-east-2.compute.amazonaws.com/api/menu/<menu_id>`
- Auth: Bearer Token (`<jwt_token>`)
- Headers: `Content-Type: application/json`
- Body (raw JSON):

```json
{
    "price": 3.2,
    "active": false
}
```

**Note:** If a menu item has the "active" field **false**, it can't be selected or added to an order. By default is created with a value of **true**.

<img width="1320" height="555" alt="Screenshot 2026-05-26 at 12 58 39 PM" src="https://github.com/user-attachments/assets/ef02d404-3c48-412b-9f45-b0fbef5e888a" />

Errors:

- `400`: Invalid category or non-positive price
- `404`: Menu item not found

#### 3.4 Menu - Delete

- Method: `DELETE`
- Relative path: `/api/menu/:id`
- Test URL: `http://ec2-18-217-126-148.us-east-2.compute.amazonaws.com/api/menu/:id`

Example:

```bash
curl -X DELETE "http://ec2-18-217-126-148.us-east-2.compute.amazonaws.com/api/menu/<menu_id>" \
  -H "Authorization: Bearer <jwt_token>"
```

Postman example:

- Method: `DELETE`
- URL: `http://ec2-18-217-126-148.us-east-2.compute.amazonaws.com/api/menu/<menu_id>`
- Auth: Bearer Token (`<jwt_token>`)

<img width="1320" height="345" alt="Screenshot 2026-05-26 at 1 01 05 PM" src="https://github.com/user-attachments/assets/b0ead07f-0458-41e9-be0c-4511db8cb3fc" />

Success:

- `204 No Content`

Errors:

- `404`: Menu item not found

#### 3.5 Orders - Create

- Method: `POST`
- Relative path: `/api/orders`
- Test URL: `http://ec2-18-217-126-148.us-east-2.compute.amazonaws.com/api/orders`

Request body:

```json
{
    "items": [
        { "menuItemId": "menu_1", "quantity": 2 },
        { "menuItemId": "menu_2", "quantity": 1 }
    ],
    "paymentMethod": "cash",
    "priorityLevel": 2
}
```

**priorityLevel:** 1 = VIP, 2 = App/Delivery, 3 = Walk-in
**paymentMethod:** The paymentMethod can be "credit_card" or "cash". The integrations, like the payment gateway or the integration with a bank to register a payment, are not part of the scope of this Coding exercise. Anyway, a Service (logic) has been implemented in code for further integration.

Example:

```bash
curl -X POST "http://ec2-18-217-126-148.us-east-2.compute.amazonaws.com/api/orders" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <jwt_token>" \
  -d '{"items":[{"menuItemId":"menu_1","quantity":2}],"paymentMethod":"cash","priorityLevel":2}'
```

Postman example:

- Method: `POST`
- URL: `http://ec2-18-217-126-148.us-east-2.compute.amazonaws.com/api/orders`
- Auth: Bearer Token (`<jwt_token>`)
- Headers: `Content-Type: application/json`
- Body (raw JSON):

```json
{
    "items": [{ "menuItemId": "menu_1", "quantity": 2 }],
    "paymentMethod": "cash",
    "priorityLevel": 2
}
```

<img width="1318" height="567" alt="Screenshot 2026-05-26 at 1 11 05 PM" src="https://github.com/user-attachments/assets/eab7a69b-aef2-4b7d-bc2b-d8e95a91410f" />

Success response example:

```json
{
    "ticket_number": 1001,
    "order_id": "ord_1",
    "total_price": 5,
    "estimated_ready_time": "2026-05-26T03:00:00.000Z",
    "status": "queued",
    "status_tracking_url": "/api/orders/ticket/1001/status"
}
```

**Note:** As requested, a Ticket number is generated and an "Estimated Ready Time" is returned. Use `status_tracking_url` to poll order status.

Errors:

- `400`: Invalid items/paymentMethod/priorityLevel or business validation failure

#### 3.6 Orders - List

- Method: `GET`
- Relative path: `/api/orders`
- Test URL: `http://ec2-18-217-126-148.us-east-2.compute.amazonaws.com/api/orders`
- Optional query: `status=queued|baking|delivery|canceled`

Example:

```bash
curl -X GET "http://ec2-18-217-126-148.us-east-2.compute.amazonaws.com/api/orders?status=queued" \
  -H "Authorization: Bearer <jwt_token>"
```

Postman example:

- Method: `GET`
- URL: `http://ec2-18-217-126-148.us-east-2.compute.amazonaws.com/api/orders`
- Auth: Bearer Token (`<jwt_token>`)
- Params (optional): `status=queued`
  **Status:** can be: 'queued' | 'baking' | 'delivery' | 'canceled'

<img width="1316" height="870" alt="Screenshot 2026-05-26 at 4 38 46 PM" src="https://github.com/user-attachments/assets/05e49c35-98c9-4a50-bb7f-7fe492382072" />

Errors:

- `400`: Invalid status filter

#### 3.7 Orders - Get By ID

- Method: `GET`
- Relative path: `/api/orders/:orderId`
- Test URL: `http://ec2-18-217-126-148.us-east-2.compute.amazonaws.com/api/orders/:orderId`

Example:

```bash
curl -X GET "http://ec2-18-217-126-148.us-east-2.compute.amazonaws.com/api/orders/<order_id>" \
  -H "Authorization: Bearer <jwt_token>"
```

Postman example:

- Method: `GET`
- URL: `http://ec2-18-217-126-148.us-east-2.compute.amazonaws.com/api/orders/<order_id>`
- Auth: Bearer Token (`<jwt_token>`)

        <img width="1316" height="753" alt="Screenshot 2026-05-26 at 4 42 24 PM" src="https://github.com/user-attachments/assets/64050be2-2a90-4a7a-a41a-e5fe28795100" />

Errors:

- `404`: Order not found

#### 3.8 Orders - Get Tasks

Each time an order is created, the corresponding baking "tasks" are created, too. This helps to handle the Kitchen status (ovens and slots).

- Method: `GET`
- Relative path: `/api/orders/:orderId/tasks`
- Test URL: `http://ec2-18-217-126-148.us-east-2.compute.amazonaws.com/api/orders/:orderId/tasks`

Example:

```bash
curl -X GET "http://ec2-18-217-126-148.us-east-2.compute.amazonaws.com/api/orders/<order_id>/tasks" \
  -H "Authorization: Bearer <jwt_token>"
```

Postman example:

- Method: `GET`
- URL: `http://ec2-18-217-126-148.us-east-2.compute.amazonaws.com/api/orders/<order_id>/tasks`
- Auth: Bearer Token (`<jwt_token>`)

        <img width="1316" height="858" alt="Screenshot 2026-05-26 at 4 47 04 PM" src="https://github.com/user-attachments/assets/df88146e-855e-4595-924e-ed52993ff569" />

Errors:

- `404`: Order not found

#### 3.9 Orders - Update Status

This endpoint only updates the "status" field, and more specifically, to cancel an order.
An order can only be canceled if all its baking "tasks" are in "queued" status. If one of its tasks is in "baking" status, the order can't be canceled.

- Method: `PATCH`
- Relative path: `/api/orders/:orderId`
- Test URL: `http://ec2-18-217-126-148.us-east-2.compute.amazonaws.com/api/orders/:orderId`

Request body:

```json
{
    "status": "canceled"
}
```

Example:

```bash
curl -X PATCH "http://ec2-18-217-126-148.us-east-2.compute.amazonaws.com/api/orders/<order_id>" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <jwt_token>" \
  -d '{"status":"delivery"}'
```

Postman example:

- Method: `PATCH`
- URL: `http://ec2-18-217-126-148.us-east-2.compute.amazonaws.com/api/orders/<order_id>`
- Auth: Bearer Token (`<jwt_token>`)
- Headers: `Content-Type: application/json`
- Body (raw JSON):

```json
{
    "status": "canceled"
}
```

<img width="1316" height="805" alt="Screenshot 2026-05-26 at 5 09 05 PM" src="https://github.com/user-attachments/assets/1c83ceed-f2f5-4268-b68d-182a879f5fff" />

Allowed status values:

- `queued`
- `baking`
- `delivery`
- `canceled`

Errors:

- `400`: Invalid status or invalid state transition
- `404`: Order not found

#### 3.10 Kitchen Status

- Method: `GET`
- Relative path: `/api/kitchen/status`
- Test URL: `http://ec2-18-217-126-148.us-east-2.compute.amazonaws.com/api/kitchen/status`

Example:

```bash
curl -X GET "http://ec2-18-217-126-148.us-east-2.compute.amazonaws.com/api/kitchen/status" \
  -H "Authorization: Bearer <jwt_token>"
```

Postman example:

- Method: `GET`
- URL: `http://ec2-18-217-126-148.us-east-2.compute.amazonaws.com/api/kitchen/status`
- Auth: Bearer Token (`<jwt_token>`)

        <img width="1315" height="856" alt="Screenshot 2026-05-26 at 5 11 22 PM" src="https://github.com/user-attachments/assets/e6c9947f-a951-4c7c-86f2-0d67f9d44070" />

Purpose:

- Returns current oven occupancy plus the queued tasks waiting to be baked.
- Useful for kitchen dashboards, operational monitoring, and ETA expectations.

Response shape:

- `ovens`: list of ovens.
- `ovens[].slots`: each slot in that oven.
- `ovens[].slots[].slotIndex`: 1-based slot number shown to clients.
- `ovens[].slots[].task`: `null` when free, otherwise active baking task data.
- `waitingQueue`: queued tasks not yet assigned to an oven slot.

Response example:

```json
{
    "ovens": [
        {
            "ovenId": 1,
            "slots": [
                {
                    "slotIndex": 1,
                    "task": {
                        "taskId": "tsk_10",
                        "orderId": "ord_7",
                        "item": "Butter Croissant",
                        "category": "pastries",
                        "priorityLevel": 1,
                        "bakingStartedAt": "2026-05-26T15:10:00.000Z",
                        "expectedDoneAt": "2026-05-26T15:20:00.000Z"
                    }
                },
                {
                    "slotIndex": 2,
                    "task": null
                }
            ]
        }
    ],
    "waitingQueue": [
        {
            "taskId": "tsk_11",
            "orderId": "ord_8",
            "item": "Classic Chocolate Cookie",
            "category": "cookies",
            "priorityLevel": 2,
            "estimatedStartAt": "2026-05-26T15:20:00.000Z",
            "estimatedEndAt": "2026-05-26T15:25:00.000Z"
        }
    ]
}
```

How oven/slot assignment works:

1. Each order item quantity is expanded into individual tasks.
2. New tasks are pushed into a priority queue.
3. Queue ordering is:
    - lower `priorityLevel` first (`1` before `2` before `3`)
    - if same priority, first created task first (FIFO by sequence)
4. The dispatcher scans ovens/slots and picks the first free slot.
5. It dequeues the next task from the queue and assigns it to that slot.
6. Task moves from `queued` -> `baking`, and timing fields are set.
7. When bake time expires, the task is marked `done`, the slot is freed, and the dispatcher runs again.

Queue and ETA notes:

- `waitingQueue` is sorted in the same order tasks will be considered for baking.
- `estimatedStartAt`/`estimatedEndAt` are projected times based on current slot workloads.
- Task-level `slotIndex` in internals is zero-based, but kitchen status response shows one-based slot numbers.

Status transitions related to kitchen flow:

- Task: `queued` -> `baking` -> `done` (or `canceled`)
- Order:
    - `queued` while all tasks are waiting
    - `baking` when at least one task is baking
    - `delivery` when all tasks are done
    - `canceled` when all related tasks are canceled

#### 3.11 Order Status By Ticket Number

- Method: `GET`
- Relative path: `/api/orders/ticket/:ticketNumber/status`
- Test URL: `http://ec2-18-217-126-148.us-east-2.compute.amazonaws.com/api/orders/ticket/:ticketNumber/status`
- Purpose: Return current order status and timing info using the `ticket_number` received at order creation.

Example:

```bash
curl -X GET "http://ec2-18-217-126-148.us-east-2.compute.amazonaws.com/api/orders/ticket/<ticket_number>/status" \
  -H "Authorization: Bearer <jwt_token>"
```

Postman example:

- Method: `GET`
- URL: `http://ec2-18-217-126-148.us-east-2.compute.amazonaws.com/api/orders/ticket/<ticket_number>/status`
- Auth: Bearer Token (`<jwt_token>`)

        <img width="1316" height="382" alt="Screenshot 2026-05-26 at 6 32 42 PM" src="https://github.com/user-attachments/assets/e612c50f-6d48-4542-b504-8b00a0e90dcd" />

Response example:

```json
{
    "ticket_number": 1001,
    "order_id": "ord_1",
    "status": "baking",
    "priority_level": 2,
    "estimated_ready_time": "2026-05-26T03:00:00.000Z",
    "delivered_at": null,
    "updated_at": "2026-05-26T02:57:22.000Z"
}
```

Errors:

- `400`: `ticketNumber` must be a positive integer
- `404`: Order not found

### 4. Common Auth Errors for Protected Endpoints

- `401`:
    - `Missing Bearer token`
    - `Invalid or expired token`
- `500`:
    - `JWT security is not configured. Add JWT_SECRET to the environment.`

---

## Environment variables

Copy `.env.example` to `.env` and adjust values as needed.

### Runtime variables used by the API

| Variable                     | Required                   | Default  | Purpose                                                                                       |
| ---------------------------- | -------------------------- | -------- | --------------------------------------------------------------------------------------------- |
| `PORT`                       | No                         | `3000`   | HTTP port where Fastify listens.                                                              |
| `MONGODB_URI`                | Yes                        | None     | MongoDB connection string used by the repository layer.                                       |
| `MONGODB_DB_NAME`            | No                         | `bakery` | Database name selected after connecting to MongoDB.                                           |
| `JWT_SECRET`                 | Yes (for protected routes) | Empty    | Secret used to sign and verify JWT tokens in login/auth middleware.                           |
| `JWT_EXPIRES_IN`             | No                         | `1h`     | Token lifetime passed to `jsonwebtoken` (for example `15m`, `1h`, `2d`).                      |
| `AUTH_USERNAME`              | Yes (for login)            | Empty    | Username accepted by `POST /api/auth/login`.                                                  |
| `AUTH_PASSWORD`              | Yes (for login)            | Empty    | Password accepted by `POST /api/auth/login`.                                                  |
| `OVEN_COUNT`                 | No                         | `2`      | Number of ovens created by the kitchen scheduler.                                             |
| `SLOTS_PER_OVEN`             | No                         | `3`      | Number of tray slots per oven used for concurrent baking capacity.                            |
| `SEED_MENU_ON_START`         | No                         | `true`   | If `true`, seeds default menu items when menu is empty at startup.                            |
| `BAKE_TIME_SCALE_MS_PER_MIN` | No                         | `1000`   | Time scaling for bake simulation. One logical bake minute equals this many real milliseconds. |
| `BAKE_RECONCILE_INTERVAL_MS` | No                         | `1000`   | Interval for the reconciliation loop that completes overdue baking tasks.                     |




