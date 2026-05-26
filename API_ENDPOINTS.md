# Snack Builder Bakery API - Endpoint Documentation

Base host used in this guide:

- `http://ec2-18-217-126-148.us-east-2.compute.amazonaws.com`

---

## 1. Endpoints That Do **Not** Require Authentication

### 1.1 Health Check

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

Successful response example:

```json
{
    "status": "ok",
    "service": "snack-builder-bakery-api",
    "mongodb": "connected",
    "ready": true
}
```

---

### 1.2 Prometheus Metrics

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

---

## 2. Authentication Endpoint

### 2.1 Login (Get JWT Token)

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

---

## 3. Endpoints That **Require Authentication**

Use this header for all endpoints below:

```http
Authorization: Bearer <jwt_token>
```

---

### 3.1 Menu - List

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

---

### 3.2 Menu - Create

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

Errors:

- `400`: Invalid payload (name/category/positive price required)

---

### 3.3 Menu - Update

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

---

### 3.4 Menu - Delete

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

---

### 3.5 Orders - Create

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

---

### 3.6 Orders - List

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

---

### 3.7 Orders - Get By ID

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

---

### 3.8 Orders - Get Tasks

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

---

### 3.9 Orders - Update Status

- Method: `PATCH`
- Relative path: `/api/orders/:orderId`
- Test URL: `http://ec2-18-217-126-148.us-east-2.compute.amazonaws.com/api/orders/:orderId`

Request body:

```json
{
    "status": "delivery"
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
    "status": "delivery"
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

---

### 3.10 Kitchen Status

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

---

### 3.11 WebSocket Order Tracking

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

---

## 4. Common Auth Errors for Protected Endpoints

- `401`:
    - `Missing Bearer token`
    - `Invalid or expired token`
- `500`:
    - `JWT security is not configured. Add JWT_SECRET to the environment.`

---

## 5. Postman Screenshot Placeholders

Use this section to add visual setup references for each endpoint category.

### 5.1 Collection Variables Setup

Suggested variables:

- `baseUrl` = `http://ec2-18-217-126-148.us-east-2.compute.amazonaws.com`
- `token` = JWT returned by login endpoint
- `menuId` = existing menu id
- `orderId` = existing order id

Screenshot placeholder:

```md
![Postman Collection Variables](docs/images/postman/collection-variables.png)
```

### 5.2 Login Request (Body + Tests)

Show:

- Method and URL
- Raw JSON body
- Optional Tests tab script to save token

Optional Tests script example:

```javascript
const json = pm.response.json();
if (json.token) {
    pm.collectionVariables.set('token', json.token);
}
```

Screenshot placeholders:

```md
![Postman Login Request Body](docs/images/postman/login-body.png)
![Postman Login Tests Tab](docs/images/postman/login-tests.png)
```

### 5.3 Bearer Token Authorization

Show:

- Authorization type = Bearer Token
- Token value = `{{token}}`

Screenshot placeholder:

```md
![Postman Bearer Token](docs/images/postman/bearer-token.png)
```

### 5.4 Request Params and Path Variables

Show examples for:

- Query params (`status=queued`)
- Path variables (`menuId`, `orderId`)

Screenshot placeholders:

```md
![Postman Query Params](docs/images/postman/query-params.png)
![Postman Path Variables](docs/images/postman/path-variables.png)
```

### 5.5 JSON Body Examples (POST/PUT/PATCH)

Show body setup in raw JSON mode for:

- Create menu
- Create order
- Update order status

Screenshot placeholders:

```md
![Postman Create Menu Body](docs/images/postman/create-menu-body.png)
![Postman Create Order Body](docs/images/postman/create-order-body.png)
![Postman Patch Order Body](docs/images/postman/patch-order-body.png)
```

### 5.6 WebSocket Setup

Show:

- WebSocket URL
- Headers with Authorization Bearer token
- Initial `order_status_snapshot` message

Screenshot placeholders:

```md
![Postman WebSocket Connect](docs/images/postman/ws-connect.png)
![Postman WebSocket Messages](docs/images/postman/ws-messages.png)
```

### 5.7 Recommended Folder Structure for Images

```text
docs/
  images/
    postman/
      collection-variables.png
      login-body.png
      login-tests.png
      bearer-token.png
      query-params.png
      path-variables.png
      create-menu-body.png
      create-order-body.png
      patch-order-body.png
      ws-connect.png
      ws-messages.png
```

---
