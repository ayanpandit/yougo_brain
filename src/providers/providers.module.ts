import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { BaseLlmProvider } from './base/llm.provider';
import { OpenAiProvider } from './llm/openai.provider';
import { GeminiProvider } from './llm/gemini.provider';
import { GroqProvider } from './llm/groq.provider';
import { BaseMapsProvider } from './base/maps.provider';
import { GoogleMapsProvider } from './maps/google-maps.provider';
import { OpenRouteServiceProvider } from './maps/open-route-service.provider';
import { BaseWeatherProvider } from './base/weather.provider';
import { OpenWeatherProvider } from './weather/open-weather.provider';
import { ImageSearchService } from './images/image-search.service';

@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: BaseLlmProvider,
      useClass: GeminiProvider, // Set Gemini as the default primary travel planner LLM
    },
    {
      provide: BaseMapsProvider,
      useClass: GoogleMapsProvider,
    },
    {
      provide: BaseWeatherProvider,
      useClass: OpenWeatherProvider,
    },
    OpenAiProvider,
    GeminiProvider,
    GroqProvider,
    OpenRouteServiceProvider,
    ImageSearchService,
  ],
  exports: [
    BaseLlmProvider,
    BaseMapsProvider,
    BaseWeatherProvider,
    OpenAiProvider,
    GeminiProvider,
    GroqProvider,
    OpenRouteServiceProvider,
    ImageSearchService,
  ],
})
export class ProvidersModule {}
