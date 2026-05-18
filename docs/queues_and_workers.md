# Asynchronous Queues & Worker Architecture

This document logs the design specifications for background jobs, BullMQ retry mechanics, and concurrency architectures of **YouGO Brain**.

## Concurrency and Execution Isolation

Because Travel AI itinerary generation requires multiple slow external network requests (geocoding, meteorological forecasts, and LLM text generation), blocking HTTP request lifecycles is not acceptable. 

To solve this, YouGO Brain utilizes a robust **producer-consumer architecture**:

1. **Producer (`ApiController`)**: Validates the input, inserts a tracking record with `PENDING` status, dispatches the job to the queue, and instantly returns a `202 Accepted` response.
2. **Queue (`BullMQ`)**: Buffers jobs safely in Redis.
3. **Consumer (`GenerationWorker`)**: Processes jobs asynchronously inside detached node worker threads.

---

## BullMQ Configuration Details

### 1. Concurrency Controls
The `GenerationWorker` is configured with a concurrency pool size of **5**:
```typescript
this.worker = new Worker(
  'generation-queue',
  async (job: Job) => { return await this.processJob(job); },
  {
    connection: this.redisConnection,
    concurrency: 5, // Process up to 5 travel AI generations in parallel
  }
);
```

### 2. Exponential Backoff & Retry Logic
To protect the system against transient network errors (third-party API timeouts, model rate limits), the queue implements a robust **exponential backoff retry strategy**:
- **Max Attempts**: 3 attempts
- **Strategy**: Exponential backoff
- **Base Delay**: 2000ms (Attempt 1: 2s, Attempt 2: 4s, Attempt 3: 8s)

```typescript
this.generationQueue = new Queue('generation-queue', {
  connection: this.redisConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
    removeOnComplete: true, // Keep Redis memory footprint minimal
    removeOnFail: { count: 100 }, // Retain failed logs for debugging
  },
});
```

---

## State Lifecycle Management

The `GenerationWorker` coordinates the persistent database state updates inside its job runner try-catch loop:

```mermaid
stateDiagram-R
    [*] --> PENDING : POST /api/v1/generate
    PENDING --> PROCESSING : Worker picks up job
    PROCESSING --> COMPLETED : Orchestration completes & passes Zod check
    PROCESSING --> FAILED : Execution crashes / LLM format validation fails
    FAILED --> PROCESSING : BullMQ triggers retry (Attempts < 3)
```
- **PENDING**: The request has been saved in PostgreSQL, and the job is queued in Redis.
- **PROCESSING**: The worker thread starts executing the stages (Enrichment, Generation, validation).
- **COMPLETED**: The full pipeline completed successfully and Zod structured schemas verified the itinerary array structure.
- **FAILED**: The pipeline crashed. The exception is re-thrown to let BullMQ track the attempt count and trigger backoff. If max attempts are reached, the database record is updated with the final error string.
