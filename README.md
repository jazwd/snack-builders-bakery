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
- **Unit Tests** through the *Vitest* testing framework. It can be executed manually in development and is also part of the Continuous integration workflow.
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

Tip: save `token` from response and use `Authorization: Bearer <token>` for protected endpoints.

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
    "active": true
}
```

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

Success response example:

```json
{
    "ticket_number": 1001,
    "order_id": "ord_1",
    "total_price": 5,
    "estimated_ready_time": "2026-05-26T03:00:00.000Z",
    "status": "queued",
    "websocket_tracking_url": "/api/ws/orders/ord_1"
}
```

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

Errors:

- `404`: Order not found

#### 3.8 Orders - Get Tasks

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

Errors:

- `404`: Order not found

#### 3.9 Orders - Update Status

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

#### 3.11 WebSocket Order Tracking

- Method: `GET` (WebSocket upgrade)
- Relative path: `/api/ws/orders/:orderId`
- Test URL: `ws://ec2-18-217-126-148.us-east-2.compute.amazonaws.com/api/ws/orders/:orderId`
- Auth: Bearer token required in handshake headers.

Connection behavior:

- On connect, server sends:
    - `type: "order_status_snapshot"`
- On updates, server pushes:
    - `type: "order_status_changed"`
- If order does not exist, socket sends error and closes.

Postman example:

- Request type: `WebSocket`
- URL: `ws://ec2-18-217-126-148.us-east-2.compute.amazonaws.com/api/ws/orders/<order_id>`
- Headers: `Authorization: Bearer <jwt_token>`

Expected messages:

- `order_status_snapshot` on connect
- `order_status_changed` when status updates

### 4. Common Auth Errors for Protected Endpoints

- `401`:
    - `Missing Bearer token`
    - `Invalid or expired token`
- `500`:
    - `JWT security is not configured. Add JWT_SECRET to the environment.`

---

## Environment variables

Copy `.env.example` to `.env` and adjust values as needed.

Required:

- `MONGODB_URI`: MongoDB connection string. Example: `mongodb://127.0.0.1:27017`

Optional:

- `MONGODB_DB_NAME`: Database name. Default: `bakery`
- `PORT`: API port. Default: `3000`
- `JWT_EXPIRES_IN`: Token expiration (for example `1h`). Default: `1h`

Required for JWT-protected routes:

- `JWT_SECRET`: Secret used to sign and verify tokens
- `AUTH_USERNAME`: Login username for `/api/auth/login`
- `AUTH_PASSWORD`: Login password for `/api/auth/login`

## Run

```bash
npm install
npm run dev
```

## Authentication

1. Get a token from `POST /api/auth/login` using:

```json
{
    "username": "your_username",
    "password": "your_password"
}
```

2. Send the token as a Bearer token:

```text
Authorization: Bearer <token>
```

All routes except `/api/health` and `/api/auth/login` require JWT.

## Docker Compose

Why there are two Compose files:

- `docker-compose.yml`: local development and testing. It builds the API image from your local source (`build:`).
- `docker-compose.ec2.yml`: EC2 deployment. It pulls a prebuilt image from GHCR (`image: ${GHCR_IMAGE}`).

Port behavior differs by file:

- Local (`docker-compose.yml`): host `3000` -> container `3000`
- EC2 (`docker-compose.ec2.yml`): host `80` -> container `3000`

This split lets local work use current code quickly while EC2 uses immutable images from CI/CD.

## Docker Compose (Local)

This repository includes Docker Compose for local setup with:

- API (`api`)
- MongoDB (`mongo`)
- Prometheus (`prometheus`)
- Grafana (`grafana`)

Start everything:

```bash
docker compose up -d --build
```

Endpoints:

- API: `http://localhost:3000`
- API health: `http://localhost:3000/api/health`
- API metrics: `http://localhost:3000/metrics`
- Prometheus: `http://localhost:9090`
- Grafana: `http://localhost:3001` (admin/admin)

Stop everything:

```bash
docker compose down
```

## Observability: Prometheus and Grafana

This project exposes Prometheus metrics at `/metrics` from the API service.

Prometheus configuration file:

- `ops/prometheus/prometheus.yml`

It scrapes the API container using:

- target: `api:3000`
- path: `/metrics`

### Start observability stack

```bash
docker compose up -d --build
```

### Test API metrics endpoint

```bash
curl -fsS http://localhost:3000/metrics | head -n 20
```

Expected output includes metric lines such as:

- `process_cpu_seconds_total`
- `process_resident_memory_bytes`

### Test Prometheus

Health endpoint:

```bash
curl -fsS http://localhost:9090/-/healthy
```

Check discovered targets:

```bash
curl -fsS 'http://localhost:9090/api/v1/targets' | jq '.data.activeTargets[] | {scrapeUrl: .scrapeUrl, health: .health}'
```

If `jq` is not installed:

```bash
curl -fsS 'http://localhost:9090/api/v1/targets'
```

Run a sample query:

```bash
curl -fsS 'http://localhost:9090/api/v1/query?query=up'
```

Expected: API target appears as `health: "up"` and query result includes `up = 1` for job `bakery-api`.

### Test Grafana

Health endpoint:

```bash
curl -fsS http://localhost:3001/api/health
```

UI login:

- URL: `http://localhost:3001`
- Username: `admin`
- Password: `admin`

Add Prometheus data source in Grafana:

1. Go to Connections > Data sources.
2. Select Prometheus.
3. Set URL to `http://prometheus:9090`.
4. Click Save & test.

Quick dashboard check:

1. Open Explore.
2. Select Prometheus data source.
3. Run query `process_resident_memory_bytes`.

### Troubleshooting

- If `docker compose ps` shows API as `unhealthy`, check logs: `docker compose logs --tail=200 api`.
- If Prometheus is up but no API metrics appear, verify `/metrics` responds from API.
- If Grafana cannot reach Prometheus, ensure data source URL is `http://prometheus:9090` (container network URL, not localhost).

## Test Compose Files Locally

Prerequisite: Docker Desktop (or Docker daemon) must be running.

If you get `Cannot connect to the Docker daemon`, start Docker Desktop first.

### 1. Validate Compose syntax (no containers started)

```bash
docker compose config
GHCR_IMAGE=ghcr.io/example/image:latest docker compose -f docker-compose.ec2.yml config
```

### 2. Full local stack test (`docker-compose.yml`)

```bash
docker compose down -v --remove-orphans
docker compose up -d --build
docker compose ps
curl -fsS http://localhost:3000/api/health
curl -fsS http://localhost:3000/metrics | head
docker compose down -v
```

Expected:

- `api`, `mongo`, `prometheus`, `grafana` are `Up` (health checks become healthy).
- `/api/health` returns JSON with status information.
- `/metrics` returns Prometheus metrics text.

### 3. Simulate EC2 file locally (`docker-compose.ec2.yml`)

Use any available image that can run this API. If your GHCR image exists:

```bash
export GHCR_IMAGE=ghcr.io/<owner>/<repo>:latest
docker compose -f docker-compose.ec2.yml down -v --remove-orphans
docker compose -f docker-compose.ec2.yml up -d
docker compose -f docker-compose.ec2.yml ps
curl -fsS http://localhost:3000/api/health
docker compose -f docker-compose.ec2.yml down -v
```

## AWS Deployment

### EC2 + Docker Compose

Use workflow `.github/workflows/deploy-ec2-compose.yml`.

It will:

1. Build and push the app image to GHCR.
2. SSH into your EC2 host.
3. Pull latest code and image.
4. Run `docker compose -f docker-compose.ec2.yml up -d`.

GitHub repository secrets required:

- `EC2_HOST`
- `EC2_USER`
- `EC2_SSH_KEY`
- `EC2_APP_DIR` (for example `/opt/snack-builder-bakery-api`)
- `ENV_FILE` (full multiline `.env` content)
- `GHCR_USERNAME`
- `GHCR_TOKEN` (PAT with `read:packages`)

## Production Notes

- Keep JWT and auth credentials out of source control.
- Prefer AWS SSM/Secrets Manager over plain environment files.
- Add TLS and a reverse proxy/load balancer (ALB/NLB) in front of the API.
- Restrict security groups so MongoDB is not publicly exposed.
