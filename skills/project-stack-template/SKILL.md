---
name: project-stack-template
description: Template for documenting this project stack. Copy and fill in your stack details.
---

# Project Stack Template

> Copy this file, fill in every section for your actual stack, and save as `.pi/project-stack.md`.
> Agent'lar projenin stack bilgisine buradan erişir.

---

## Stack Overview

**Backend:**

- Language & version: [e.g. PHP 8.3 / Node 22 / Python 3.12 / Go 1.23]
- Framework: [e.g. Laravel 12 / NestJS / FastAPI / Gin]
- API style: [e.g. REST / GraphQL / tRPC / gRPC]
- Runtime notes: [e.g. long-lived process, FPM, serverless — affects state management rules]

**Frontend:**

- Language: [e.g. TypeScript 5]
- Framework: [e.g. Vue 3 / React 18 / Svelte 5]
- Meta-framework / routing: [e.g. Inertia.js / Next.js / Nuxt / SvelteKit / none]
- Styling: [e.g. Tailwind CSS v4 / CSS Modules / styled-components]
- Build tool: [e.g. Vite / Turbopack / Webpack]
- SSR: [yes / no — if yes, list SSR-unsafe patterns to avoid]

**Databases:**

- Primary DB: [e.g. MySQL 8 / PostgreSQL 16 / MongoDB 7]
- Cache / queue backend: [e.g. Redis 7 / none]
- Analytics / OLAP: [e.g. ClickHouse / BigQuery / none]
- ORM / query builder: [e.g. Eloquent / Prisma / SQLAlchemy / GORM]

**Infrastructure:**

- Containerization: [e.g. Docker + docker-compose / Kubernetes / none]
- CI/CD: [e.g. GitHub Actions / GitLab CI / none]
- Cloud / hosting: [e.g. AWS / GCP / Hetzner / bare metal]

---

## Project Structure

Paste your actual folder tree here so agents know where to put files.

---

## Test Commands

```bash
# Run all tests
[command]

# Run a specific test file or suite
[command with filter example]

# Run with coverage report
[command]
```

---

## Build & Dev Commands

```bash
# Start development server
[command]

# Build for production
[command]

# Lint / format code
[command]
```

---

## Critical Runtime Constraints

List runtime-specific rules developers MUST follow to avoid crashes or data corruption.
Leave blank if none apply.

- [e.g. "Never use static mutable state — process is long-lived"]
- [e.g. "All DB access must go through the repository layer"]
- [e.g. "SSR: never access window/document outside onMounted()"]
- [e.g. "All background jobs must be idempotent"]

---

## Architecture Patterns

The patterns this project uses — agents must apply these consistently, not invent new ones.

- **Request handling:** [e.g. Controller → FormRequest → Action → Response]
- **Business logic:** [e.g. Domain services / Use cases / Actions / Service layer]
- **Data access:** [e.g. Repository pattern / Active Record / CQRS]
- **Events / async:** [e.g. Domain events → Listeners → Queued jobs]
- **Frontend state:** [e.g. Pinia stores for global state / composables for local]

---

## Naming Conventions

| Type | Convention | Example |
|---|---|---|
| [DB tables] | [e.g. snake_case plural] | [e.g. user_profiles] |
| [Classes] | [e.g. PascalCase] | [e.g. SendEmailAction] |
| [Files] | [e.g. kebab-case] | [e.g. user-profile.ts] |
| [API routes] | [e.g. kebab-case] | [e.g. /api/user-profiles] |

---

## External Services & Packages

| Service / Package | Purpose | Notes |
|---|---|---|
| [e.g. Stripe] | [payments] | [e.g. use SDK, never raw API] |
| [e.g. S3] | [file storage] | [...] |
