# NESale - Autonomous AI Sales & Booking SaaS Platform

An autonomous AI sales assistant and customer conversion SaaS platform built for e-commerce storefronts and service-based businesses.

## Features
- **Autonomous AI Sales & Booking Agent**: Embeddable shopper widget (`widget.js`) with intelligent product discovery, appointment booking, and instant checkout recommendations.
- **Service & Appointment Scheduling**: Real-time availability slot generation, conflict checking, and calendar booking for service-based professionals.
- **Multi-Tenant Architecture**: Robust tenant isolation, team management, and role-based access control (RBAC).
- **RAG & Knowledge Base**: Automated crawling, text chunking, and vector embedding for accurate store knowledge Q&A.
- **Ultra-Fast Performance**: In-memory SWR caching layer and tenant memoization reducing query latency to sub-50ms.

## Getting Started

First, install dependencies:

```bash
npm install
```

Configure your environment variables in `.env`:
```bash
cp .env.example .env
```

Generate Prisma client:
```bash
npx prisma generate
```

Run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Documentation

For full architectural blueprints, database schema details, and API documentation, refer to [PROJECT_DOCUMENTATION.md](./PROJECT_DOCUMENTATION.md).
