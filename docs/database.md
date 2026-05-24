# Centralized Database Architecture

This document outlines the database design and connection strategy for the **YouGO Brain** AI backend.

## 1. Stateless Client Architecture

To maintain industry-grade microservice hygiene, `yougo_brain` does **not** manage its own database or migration files. It acts as a stateless client that reads and writes directly to the primary database owned by the main backend (`yougo-server`).

- **Single Source of Truth**: The `yougo-server` backend officially owns and defines database migrations.
- **Connection**: `yougo_brain` connects directly to the centralized Neon PostgreSQL instance via the exact same `DATABASE_URL` as the main server.
- **Migrations**: You must **never** run `npx prisma migrate dev` inside this repository. Migrations are strictly handled and executed in the `yougo-server` repository to ensure a single transactional schema lineage.
- **Fully Unified Schema**: To prevent drift and ensure compile-time relationship integrity, `yougo_brain/prisma/schema.prisma` is a 100% identical copy of `yougo-server/prisma/schema.prisma`, including relations to `User` and `AuditLog`. We use `npx prisma generate` here to produce type-safe typings in the microservice layer.

---

## 2. Dynamic JSONB Storage Schema

To handle unstructured AI itinerary details cleanly without complex SQL joins, we leverage a unified **native PostgreSQL JSONB** flat-table schema:

```prisma
model Trip {
  id           String           @id @default(uuid())
  createdAt    DateTime         @default(now())
  updatedAt    DateTime         @updatedAt
  status       GenerationStatus @default(PENDING)
  error        String?          @db.Text
  generationId String           @unique
  payload      Json             // Input parameters (POST body DTO)
  response     Json?            // Output itinerary (repaired completed JSON)
  type         String           @default("AI_model")
  metadata     Json?            // Optional intermediate/telemetry steps list!
  userId       String
  user         User             @relation(fields: [userId], references: [id], onDelete: Cascade)

  // Extracted Feed Columns
  coverImage     String?
  tripType       String?
  totalDays      Int?
  destination    String?
  baseCurrency   String?
  totalPersons   Int?
  experienceType String?
  perPersonCost  Int?

  @@map("trips")
}
```

### JSONB Advantages:
- **Fast retrieval**: Allows indexing on nested JSON keys.
- **Flexibility**: We can enrich and restructure travel plans dynamically without modifying the schema or executing database migrations.
- **Telemetry**: Background worker process metrics and step-by-step progress tracking are dynamically appended to the `metadata` column.
