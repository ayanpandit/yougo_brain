import { Injectable, Logger } from '@nestjs/common';
import { EnrichmentStage } from '../pipelines/stages/enrichment.stage';
import { PromptCompilationStage } from '../pipelines/stages/prompt-compilation.stage';
import { LlmGenerationStage } from '../pipelines/stages/llm-generation.stage';
import { ValidationStage } from '../pipelines/stages/validation.stage';
import { PersistenceStage } from '../pipelines/stages/persistence.stage';
import { Itinerary, repairItinerary } from '../schemas/itinerary.schema';
import { BaseLlmProvider } from '../providers/base/llm.provider';
import {
  OpenRouteServiceProvider,
  RouteDetails,
} from '../providers/maps/open-route-service.provider';
import { ImageSearchService } from '../providers/images/image-search.service';

@Injectable()
export class OrchestrationService {
  private readonly logger = new Logger(OrchestrationService.name);

  constructor(
    private readonly enrichmentStage: EnrichmentStage,
    private readonly promptCompilationStage: PromptCompilationStage,
    private readonly llmGenerationStage: LlmGenerationStage,
    private readonly validationStage: ValidationStage,
    private readonly persistenceStage: PersistenceStage,
    private readonly primaryLlmProvider: BaseLlmProvider,
    private readonly openRouteService: OpenRouteServiceProvider,
    private readonly imageSearch: ImageSearchService,
  ) {}

  async orchestrate(generationId: string, payload: any): Promise<Itinerary> {
    this.logger.log(
      `[Orchestrator] Starting workflow for Generation ${generationId}`,
    );

    // Extract basic fields
    const tripDetails = payload.trip_details;
    const partyComposition = payload.party_composition;
    const preferences = payload.preferences;
    const travelMedium = payload.travel_medium;

    // =========================================================================
    // STEP 1: DESTINATION DECISION (IF EMPTY)
    // =========================================================================
    let destination = tripDetails.destination?.trim() || '';
    if (!destination) {
      this.logger.log(
        '[Orchestrator] Destination is empty. Running fast LLM Destination Picker...',
      );
      destination = await this.decideDestination(payload);
      tripDetails.destination = destination;
      this.logger.log(
        `[Orchestrator] LLM selected destination: "${destination}"`,
      );
    }

    // =========================================================================
    // STEP 2: ENRICHMENT (MAPS + WEATHER)
    // =========================================================================
    const enrichment = await this.enrichmentStage.execute(destination);

    await this.persistenceStage.execute({
      generationId,
      stepName: 'enrichment',
      payload: enrichment,
      validationPassed: true,
    });

    // =========================================================================
    // STEP 3: ROUTE ENRICHMENT (ORIGIN -> DESTINATION)
    // =========================================================================
    // Get coordinates for origin first using geocoder
    let originCoords = { lat: 28.6692, lng: 77.4538 }; // Default Ghaziabad
    try {
      this.logger.log(`Geocoding origin location: "${tripDetails.origin}"`);
      const originLoc = await this.enrichmentStage.execute(tripDetails.origin);
      originCoords = {
        lat: originLoc.location.latitude,
        lng: originLoc.location.longitude,
      };
    } catch (err: any) {
      this.logger.warn(
        `Could not geocode origin "${tripDetails.origin}". Using standard NCR coordinates fallback.`,
      );
    }

    // Fetch directions from OpenRouteService
    const routeDetails = await this.openRouteService.getDrivingDirections(
      originCoords.lat,
      originCoords.lng,
      enrichment.location.latitude,
      enrichment.location.longitude,
    );

    // =========================================================================
    // STEP 4: PROMPT COMPILATION
    // =========================================================================
    const compiledPrompt = await this.promptCompilationStage.execute({
      tripDetails,
      partyComposition,
      preferences,
      travelMedium,
      enrichment,
      routeDetails,
    });

    // =========================================================================
    // STEP 5: LLM GENERATION
    // =========================================================================
    const llmResponse = await this.llmGenerationStage.execute(
      compiledPrompt,
      true,
    );

    await this.persistenceStage.execute({
      generationId,
      stepName: 'llm-generation',
      payload: {
        rawContent: llmResponse.content,
        modelUsed: llmResponse.model,
        usage: llmResponse.usage,
      },
      validationPassed: true,
    });

    // =========================================================================
    // STEP 6: DYNAMIC MEDIA ENRICHMENT (UNSPLASH + PEXELS CONCURRENT SEARCH)
    // =========================================================================
    let parsedItinerary: any;
    try {
      let cleaned = llmResponse.content.trim();
      // Remove markdown code blocks if present
      if (cleaned.startsWith('```')) {
        cleaned = cleaned
          .replace(/^```(?:json)?\n?/i, '')
          .replace(/\n?```$/i, '');
      }
      cleaned = cleaned.trim();

      // Extract JSON bounding structure
      const firstBrace = cleaned.indexOf('{');
      const lastBrace = cleaned.lastIndexOf('}');
      if (firstBrace !== -1 && lastBrace !== -1 && lastBrace >= firstBrace) {
        cleaned = cleaned.substring(firstBrace, lastBrace + 1);
      }

      // Preemptively repair common minor JSON syntactical errors (e.g. trailing commas)
      cleaned = cleaned.replace(/,(\s*[}\]])/g, '$1');

      parsedItinerary = JSON.parse(cleaned);
    } catch (err: any) {
      this.logger.error(
        `Failed to clean or parse raw LLM output in post-processing: ${err.message}`,
      );
      throw new Error(`JSON Clean & Parse Stage Failure: ${err.message}`);
    }

    // Repair structure temporarily so we can map safely
    parsedItinerary = repairItinerary(parsedItinerary);

    // Override input parameters for absolute precision and frontend safety
    parsedItinerary.summary.destination =
      enrichment.location.formattedAddress || destination;
    parsedItinerary.summary.totalDays = tripDetails.days;
    parsedItinerary.summary.totalPersons = partyComposition.totalPersons;
    parsedItinerary.summary.travelers = partyComposition.travelers;

    // Run visual media enrichment concurrently to ensure fast latency
    try {
      this.logger.log(
        '[Orchestrator] Fetching high-quality images concurrently from Unsplash/Pexels...',
      );

      const imagePromises: Promise<any>[] = [];

      // 1. Destination cover image
      imagePromises.push(
        this.imageSearch
          .searchImage(`${destination} landmark tourism`)
          .then((url) => {
            parsedItinerary.summary.imageUrl = url;
          }),
      );

      // 2. Day cover images and activity images
      if (Array.isArray(parsedItinerary.days)) {
        parsedItinerary.days.forEach((dayPlan: any) => {
          // Day cover photo
          imagePromises.push(
            this.imageSearch
              .searchImage(`${destination} scenic travel`)
              .then((url) => {
                dayPlan.destinationImageUrl = url;
              }),
          );

          // Daily activities photos
          if (Array.isArray(dayPlan.dailyActivities)) {
            dayPlan.dailyActivities.forEach((activity: any) => {
              imagePromises.push(
                this.imageSearch
                  .searchImage(`${activity.name} ${destination}`)
                  .then((url) => {
                    activity.imageUrl = url;
                  }),
              );
            });
          }
        });
      }

      // Execute all media queries concurrently
      await Promise.all(imagePromises);
      this.logger.log(
        '[Orchestrator] Concurrent visual media enrichment complete!',
      );
    } catch (mediaError: any) {
      this.logger.error(
        'Failed to run concurrent media enrichment:',
        mediaError.message,
      );
    }

    // =========================================================================
    // STEP 7: VALIDATION, AUTO-REPAIR & DEEP PERSISTENCE
    // =========================================================================
    try {
      // Pass the fully media-enriched JSON string back to validation
      const finalizedItinerary = this.validationStage.execute(
        JSON.stringify(parsedItinerary),
      );

      await this.persistenceStage.execute({
        generationId,
        stepName: 'validation',
        payload: finalizedItinerary,
        validationPassed: true,
      });

      this.logger.log(
        `[Orchestrator] Workflow completed successfully for Generation ${generationId}!`,
      );
      return finalizedItinerary;
    } catch (validationError: any) {
      this.logger.error(
        `[Orchestrator] Validation failed at stage 7 for Generation ${generationId}`,
      );

      await this.persistenceStage.execute({
        generationId,
        stepName: 'validation',
        payload: parsedItinerary,
        validationPassed: false,
        error: validationError.message || 'Itinerary format validation failed',
      });

      throw validationError;
    }
  }

  private async decideDestination(payload: any): Promise<string> {
    const tripDetails = payload.trip_details;
    const preferences = payload.preferences;
    const travelersText = payload.party_composition.travelers
      .map((t: any) => `Traveler: sex=${t.sex}, age=${t.age}`)
      .join(', ');

    const userPrompt = `
Based on these detailed travel parameters, recommend a single perfect, prominent, and highly attractive travel destination in the region or country suitable for the travelers.
Return ONLY the name of the destination and state/province/country (e.g. "Manali, Himachal Pradesh, India" or "Shimla, Himachal Pradesh, India" or "Goa, India"). Do not return any other text, warnings, markdown blocks, or notes. Just the plain text name of the destination.

Travel Parameters:
- Origin: ${tripDetails.origin}
- Duration: ${tripDetails.days} Days
- Budget: ${tripDetails.budgetINR} INR
- Travel Style: ${preferences.travel_style}
- Luxury Preference: ${preferences.luxury_level}
- Food Preference: ${preferences.food_preference}
- Party Size: ${payload.party_composition.totalPersons}
- Travelers: ${travelersText}
    `.trim();

    try {
      const response = await this.primaryLlmProvider.generate({
        systemPrompt:
          'You are an accurate, single-answer travel recommender assistant. Output only the destination name and nothing else.',
        userPrompt,
        temperature: 0.3,
      });

      const cleaned = response.content.trim().replace(/^['"\s]+|['"\s]+$/g, '');
      if (cleaned.length > 2) {
        return cleaned;
      }
      throw new Error('LLM picked invalid empty destination');
    } catch (err: any) {
      this.logger.error(
        `Destination picker failed: ${err.message}. Falling back to Manali, Himachal Pradesh.`,
      );
      return 'Manali, Himachal Pradesh, India';
    }
  }
}
