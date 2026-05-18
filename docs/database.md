# Database Persistence and Schema Isolation

This document outlines the design decisions for PostgreSQL schema isolation, Prisma 7 configuration, and dynamic JSONB persistence structures.

## 1. Schema Isolation (Multi-Tenant Microservice Strategy)

Because **YouGO Brain** shares the exact same production-linked Neon PostgreSQL instance with the primary monolithic backend `yougo-server`, running a naive `db push` or migrations on the default `public` schema would trigger drop-table conflicts (Prisma would attempt to drop the `User` table, which is not defined in `yougo_brain`'s schema).

To solve this elegantly without provisioning additional databases, we implemented **PostgreSQL Schema Isolation**:

- All tables inside `yougo_brain` are created under a dedicated `yougo_brain` database schema instead of the shared `public` schema.
- This is achieved by appending `&schema=yougo_brain` to the `DATABASE_URL` connection strings across all env files (`.env`, `.env.development`, `.env.production`).

```text
DATABASE_URL="postgresql://neondb_owner:...@ep-...neon.tech/neondb?sslmode=require&schema=yougo_brain"
```

When Prisma connects, it automatically maps namespace schemas, creating isolated tables that never conflict with other services!

---

## 2. Prisma 7 Compliance

We configure the schema using the state-of-the-art **Prisma 7 standard**:
- Connection URLs are completely removed from `prisma/schema.prisma`.
- Instead, Prisma 7 resolves database settings from `prisma.config.ts` during runtime compilation and migration.

```typescript
// prisma.config.ts
import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: process.env["DATABASE_URL"],
  },
});
```

---

## 3. Dynamic JSONB Storage Schema

To handle unstructured AI itinerary details and step metrics cleanly without complex SQL joins, we leverage **native PostgreSQL JSONB fields**:

```prisma
model Generation {
  id           String             @id @default(uuid())
  status       GenerationStatus   @default(PENDING)
  promptParams Json               // Input prompts, locations, dates, preferences
  metadata     Json?              // Additional telemetry / provider data / cost
  error        String?            // Final error message if failed
  createdAt    DateTime           @default(now())
  updatedAt    DateTime           @updatedAt
  outputs      GenerationOutput[]

  @@map("generations")
}

model GenerationOutput {
  id               String      @id @default(uuid())
  generationId     String
  stepName         String      // e.g. "enrichment", "llm-generation", "validation"
  payload          Json        // JSONB field for dynamic structured AI data
  validationPassed Boolean     @default(true)
  error            String?     // Validation or process error if occurred
  createdAt        DateTime    @default(now())
  updatedAt        DateTime    @updatedAt
  generation       Generation  @relation(fields: [generationId], references: [id], onDelete: Cascade)

  @@index([generationId])
  @@map("generation_outputs")
}
```

### JSONB Advantages:
- **Fast retrieval**: Allows index structures on nested JSON keys (e.g. indexing the geolocation details inside `enrichment` outputs).
- **Flexibility**: We can enrich travel plans at step 3 with new structures without modifying the schema or executing database migrations.
