import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { BaseLlmProvider } from './base/llm.provider';
import { OpenAiProvider } from './llm/openai.provider';
import { GeminiProvider } from './llm/gemini.provider';
import { BaseMapsProvider } from './base/maps.provider';
import { GoogleMapsProvider } from './maps/google-maps.provider';
import { BaseWeatherProvider } from './base/weather.provider';
import { OpenWeatherProvider } from './weather/open-weather.provider';

@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: BaseLlmProvider,
      useClass: OpenAiProvider, // Primary default is OpenAI, fully interchangeable with GeminiProvider
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
  ],
  exports: [
    BaseLlmProvider,
    BaseMapsProvider,
    BaseWeatherProvider,
    OpenAiProvider,
    GeminiProvider,
  ],
})
export class ProvidersModule {}
