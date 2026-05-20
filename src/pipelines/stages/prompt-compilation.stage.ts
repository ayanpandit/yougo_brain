import { Injectable, Logger } from '@nestjs/common';
import { PromptsService } from '../../prompts/prompts.service';
import { EnrichmentOutput } from './enrichment.stage';
import { RouteDetails } from '../../providers/maps/open-route-service.provider';

export interface PromptCompilationInput {
  tripDetails: {
    origin: string;
    destination: string;
    startDate: string;
    days: number;
    budgetINR: number;
    isRoundTrip: boolean;
  };
  partyComposition: {
    totalPersons: number;
    travelers: Array<{ sex: string; age: number }>;
  };
  preferences: {
    food_preference: string;
    travel_style: string;
    luxury_level: string;
  };
  travelMedium: {
    mixed_best_suitable: boolean;
    bike: any;
    car: any;
    train: any;
    flights: any;
    bus: any;
  };
  enrichment: EnrichmentOutput;
  routeDetails: RouteDetails;
}

@Injectable()
export class PromptCompilationStage {
  private readonly logger = new Logger(PromptCompilationStage.name);

  constructor(private readonly promptsService: PromptsService) {}

  async execute(input: PromptCompilationInput): Promise<string> {
    this.logger.log(
      'Executing Prompt Compilation Stage for high-personalized itinerary...',
    );

    // 1. Format travelers list
    const travelersFormatted = input.partyComposition.travelers
      .map(
        (t, idx) =>
          `  * Traveler ${idx + 1}: ${t.sex === 'M' ? 'Male' : t.sex === 'F' ? 'Female' : t.sex}, Age ${t.age}`,
      )
      .join('\n');
    const partyCompositionText = `Total Persons: ${input.partyComposition.totalPersons}\n${travelersFormatted}`;

    // 2. Format preferences
    const preferencesText = `* Food Preference: ${input.preferences.food_preference.toUpperCase()}
* Travel Style: ${input.preferences.travel_style}
* Luxury & Accommodation Level: ${input.preferences.luxury_level}`;

    // 3. Format travel mediums
    const mediumsList: string[] = [];
    if (input.travelMedium.bike?.selected) {
      mediumsList.push(
        `  * Bike: Type ${input.travelMedium.bike.type}, Sharing ${input.travelMedium.bike.sharing}, Ownership ${input.travelMedium.bike.ownership}`,
      );
    }
    if (input.travelMedium.car?.selected) {
      mediumsList.push(
        `  * Car: Type ${input.travelMedium.car.type}, Ownership ${input.travelMedium.car.ownership}`,
      );
    }
    if (input.travelMedium.train?.selected) {
      mediumsList.push(`  * Train Class: ${input.travelMedium.train.class}`);
    }
    if (input.travelMedium.flights?.selected) {
      mediumsList.push(`  * Flight Class: ${input.travelMedium.flights.class}`);
    }
    if (input.travelMedium.bus?.selected) {
      mediumsList.push(`  * Bus Class: ${input.travelMedium.bus.class}`);
    }
    if (input.travelMedium.mixed_best_suitable) {
      mediumsList.push(
        `  * MIXED TRANSPORT ALLOWED: You are encouraged to mix transport modes (e.g. train/bus to the hills and rented car/bike locally) to balance cost and travel time.`,
      );
    }
    const travelMediumText =
      mediumsList.length > 0
        ? mediumsList.join('\n')
        : '  * Standard transit (allow AI to choose best routes).';

    // 4. Format weather
    const weatherSummary = `${input.enrichment.weather.temperatureC}°C, ${input.enrichment.weather.condition}. Wind: ${input.enrichment.weather.windSpeedKph} km/h.`;

    // 5. Format route enrichment
    const routeEnrichment = `Total Driving Route Distance: ${input.routeDetails.distance}, Travel Time: ${input.routeDetails.travelTime}`;

    // Compile variables
    const compiled = await this.promptsService.compilePrompt(
      'system/itinerary_planner.txt',
      {
        origin: input.tripDetails.origin,
        destination: input.tripDetails.destination,
        startDate: input.tripDetails.startDate,
        durationDays: input.tripDetails.days,
        budgetINR: input.tripDetails.budgetINR,
        isRoundTrip: input.tripDetails.isRoundTrip ? 'Yes' : 'No',
        partyComposition: partyCompositionText,
        preferencesText,
        travelMediumText,
        weather: weatherSummary,
        latitude: input.enrichment.location.latitude,
        longitude: input.enrichment.location.longitude,
        routeEnrichment,
      },
    );

    this.logger.log(
      'Prompt successfully compiled with complete travel preferences!',
    );
    return compiled;
  }
}
