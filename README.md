# snack-builders-bakery

Stack Builder coding exercise

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
