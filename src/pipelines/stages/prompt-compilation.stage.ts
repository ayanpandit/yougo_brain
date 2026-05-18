import { Injectable, Logger } from '@nestjs/common';
import { PromptsService } from '../../prompts/prompts.service';
import { EnrichmentOutput } from './enrichment.stage';

export interface PromptCompilationInput {
  destination: string;
  durationDays: number;
  preferences: string;
  enrichment: EnrichmentOutput;
}

@Injectable()
export class PromptCompilationStage {
  private readonly logger = new Logger(PromptCompilationStage.name);

  constructor(private readonly promptsService: PromptsService) {}

  async execute(input: PromptCompilationInput): Promise<string> {
    this.logger.log('Executing Prompt Compilation Stage...');

    const weatherSummary = `${input.enrichment.weather.temperatureC}°C, ${input.enrichment.weather.condition}. Wind: ${input.enrichment.weather.windSpeedKph} km/h.`;

    const compiled = await this.promptsService.compilePrompt('system/itinerary_planner.txt', {
      destination: input.destination,
      durationDays: input.durationDays,
      preferences: input.preferences || 'Standard leisure tourism, balanced sightseeing and relaxation',
      weather: weatherSummary,
      latitude: input.enrichment.location.latitude,
      longitude: input.enrichment.location.longitude,
    });

    this.logger.log('Prompt successfully compiled!');
    return compiled;
  }
}
