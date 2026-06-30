# YouGO AI Trip Planner - Developer Architecture Guide

This document details the backend architectural design, system stages, and code structure of the **YouGO AI Trip Planner API**.

---

## 🏛️ System Architecture Overview

The backend is built as a highly modular, decoupled pipeline architecture in NestJS, utilizing BullMQ for high-performance background job processing.

```
[Client Request]
       │ (HTTP POST)
       ▼
[ApiController] (Http boundary validation via class-validator DTOs)
       │
       ├─► [Prisma Database] (Creates tracker row in PENDING status)
       │
       ▼
[QueuesService] (Pushes job payload to BullMQ Redis Queue)
       │
   (Redis Connection)
       ▼
[GenerationWorker] (Subscribes to Redis, concurrency=5, handles attempts/retries)
       │
       ▼
[OrchestrationService] (Main Workflow Engine)
       │
       ├─► 1. LLM Destination Picker (Runs fast Gemini picker if destination is "")
       │
        ├─► 2. EnrichmentStage
             ├─► GoogleMapsProvider / OpenRouteService Geocoder (Geocodes address into coordinates)
             └─► OpenWeatherProvider (Queries meteorological forecasts via Open-Meteo)
        │
        ├─► 3. OpenRouteServiceProvider (Calculates driving routes and times)
        │
        ├─► 4. PromptCompilationStage (Formats variables and loads prompt templates)
        │
        ├─► 5. LlmGenerationStage (Primary Gemini-2.5-Flash / Fallback Groq Llama-3.3)
       │
       ├─► 6. ImageSearchService (Queries landscape Unsplash / Pexels image media concurrently)
       │
       └─► 7. ValidationStage (Deep-merges with template, repairs syntax, Zod validates)
               │
               ▼
[PersistenceStage] (Saves final visually enriched, crash-safe itinerary JSON to PostgreSQL)
```

---

## 📂 Core Folder & File Layout

* `src/api/`
  * `api.controller.ts`: Defines POST and GET HTTP endpoints, tracking status polling.
  * `generate.dto.ts`: Exhaustive class-validator nested DTOs (trips, composition, mediums).
* `src/orchestration/`
  * `orchestration.service.ts`: Root workflow manager orchestrating picking, enrichment, prompt, generation, media searching, healing, and database writes.
* `src/pipelines/stages/`
  * `enrichment.stage.ts`: Coordinates geo geocoding and current weather coordinate parsing.
  * `prompt-compilation.stage.ts`: Formats detailed traveler details and constraints into template tokens.
  * `llm-generation.stage.ts`: Executes text generation with built-in API error recovery failover routing.
  * `validation.stage.ts`: Triggers the Zod validation parsing.
  * `persistence.stage.ts`: Stores dynamic step payloads in the `generation_outputs` database table.
* `src/providers/`
  * `llm/gemini.provider.ts`: Primary Gemini model client.
  * `llm/groq.provider.ts`: Secondary OpenAI-compatible failover model client.
  * `maps/google-maps.provider.ts`: Google Places API geocoder.
  * `maps/open-route-service.provider.ts`: Coordinates router with geometric Haversine recovery.
  * `images/image-search.service.ts`: Image provider combining Unsplash, Pexels, and custom local matching.
  * `weather/open-weather.provider.ts`: Open-Meteo current meteorological forecaster.
* `src/schemas/`
  * `itinerary.schema.ts`: Zod schema structures, default itinerary objects, and the deep-merge helper.
* `src/validation/`
  * `validation.service.ts`: Strips markdown wrappers, repairs syntax, runs self-healer, and validates schema.

---

## ⚡ Key Pipeline Stages Detailed

### 1. Asynchronous Task Queue (BullMQ)
* **Queue Configuration (`QueuesService`)**:
  Initialized with exponential backoff retries (3 attempts, starting at 2 seconds delay) to protect the app from transient third-party API issues.
* **Worker Execution (`GenerationWorker`)**:
  Subscribes to Redis, updates database tracking states to `PROCESSING`, executes the orchestrator, and catches worker crashes to mark states as `FAILED`.

### 2. Geocoding, Weather, and Driving Routing
* **Geocoding & Maps**: Resolves standard string addresses (e.g. `"Manali"`) into precise GPS latitude and longitude. Uses the Google Maps API when configured, with an automatic fallback to **OpenRouteService Geocoding** using the ORS API key. This ensures high geocoding accuracy even when Google Keys are not available.
* **Open-Meteo Weather**: Fetches current real-time meteorological temperature and condition metrics without requiring API keys.
* **OpenRouteService (ORS) Routing**:
  Utilizes the coordinate pairs of the origin and destination to query `https://api.openrouteservice.org/v2/directions/driving-car`.
  * **Failover Math (Haversine)**: If ORS returns a network error (or places are on different continents like Ghaziabad to Paris), it falls back to a straight-line geometric distance multiplied by a detour/winding factor of `1.3`, assuming average travel speed is `50 km/h`.
 
### 3. Dual-Provider LLM Failover Redundancy
To ensure the travel planner works 24/7/365, we implement dual-layer model redundancy:
* **Primary LLM**: **Gemini 2.5 Flash** (via the feature-rich `/v1beta` endpoint, using `GEMINI_API_KEY`).
* **Fallback LLM**: **Groq Llama 3.3 70B** (using `FALLBACK_GROQ_API_KEY`).
If the Gemini API throws a 429 rate limit or 500 server exception, the `LlmGenerationStage` automatically traps the error and routes the prompt to Groq, returning a successful plan without the user ever noticing a glitch.

### 4. Concurrent Media Harvesting
Rather than making the LLM write hardcoded image links (which are often broken or hallucinated), the backend harvests real media in the post-processing stage:
* The LLM creates the plan text, and the orchestrator iterates through the destination name and activity names.
* It executes **concurrent HTTP requests** (`Promise.all()`) using `ImageSearchService` searching Unsplash first, Pexels second, and fallback curated assets third.
* Concurrency drops the total media search latency from over 8 seconds to under 800 milliseconds!

### 5. Deep-Merge Self-Healing Parser
Our self-healing parser is designed to prevent frontend crashes:
* It first runs cleanups to strip markdown code blocks (e.g. ` ```json ` markers) and extracts raw bracketed text.
* Resolves minor LLM syntax anomalies like trailing commas (`repaired = repaired.replace(/,(\s*[}\]])/g, '$1')`).
* Run the parsed object through our **Deep-Merge Healer**:
  ```typescript
  // Deep-merges LLM object against standard schema template
  const repaired = deepMerge(defaultItineraryTemplate, rawParsed);
  ```
  This ensures that *every single key* expected by the Zod validator (and the frontend UI) is present, substituting missing values with `"Not Applicable"` or standard numerical defaults before Zod validation runs.

---

## ⚙️ Environment Configuration

Ensure your `.env` contains:
```ini
DATABASE_URL="postgresql://neondb_owner:...@ep-...tech/neondb?sslmode=require"
PORT=3000
REDIS_HOST=127.0.0.1
REDIS_PORT=6379

GEMINI_API_KEY="AIzaSy..."
FALLBACK_GROQ_API_KEY="gsk_..."
OPEN_ROUTE_SERVICE_KEY="eyJ..."
SERPAPI_KEY="a739..."
UNSPLASH_API_KEY="_Pe..."
PEXELS_API_KEY="dXk..."
```

---

## 🧪 Operational Commands

* **Launch development server**:
  ```bash
  npm run start:dev
  ```
* **Verify formatting & linting**:
  ```bash
  npm run format
  npm run lint
  ```
* **Build production package**:
  ```bash
  npm run build
  ```
