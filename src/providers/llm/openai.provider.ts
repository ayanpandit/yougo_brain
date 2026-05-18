import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BaseLlmProvider, LlmRequest, LlmResponse } from '../base/llm.provider';
import axios from 'axios';

@Injectable()
export class OpenAiProvider extends BaseLlmProvider {
  private readonly logger = new Logger(OpenAiProvider.name);
  private apiKey: string;

  constructor(private readonly configService: ConfigService) {
    super();
    this.apiKey = this.configService.get<string>('OPENAI_API_KEY', '');
  }

  getName(): string {
    return 'openai';
  }

  async generate(request: LlmRequest): Promise<LlmResponse> {
    const model = 'gpt-4o';
    this.logger.log(`Executing LLM generation via OpenAI model: ${model}`);

    if (!this.apiKey) {
      this.logger.warn('OPENAI_API_KEY is not defined! Falling back to simulated Travel AI response...');
      return this.generateMockResponse(request);
    }

    try {
      const messages: any[] = [];
      if (request.systemPrompt) {
        messages.push({ role: 'system', content: request.systemPrompt });
      }
      messages.push({ role: 'user', content: request.userPrompt });

      const response = await axios.post(
        'https://api.openai.com/v1/chat/completions',
        {
          model,
          messages,
          temperature: request.temperature ?? 0.7,
          max_tokens: request.maxTokens ?? 2000,
          response_format: request.responseFormat === 'json' ? { type: 'json_object' } : undefined,
        },
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${this.apiKey}`,
          },
          timeout: 30000, // 30s timeout
        },
      );

      const content = response.data.choices[0].message.content;
      const usage = response.data.usage;

      return {
        content,
        model,
        usage: usage
          ? {
              promptTokens: usage.prompt_tokens,
              completionTokens: usage.completion_tokens,
              totalTokens: usage.total_tokens,
            }
          : undefined,
      };
    } catch (error: any) {
      this.logger.error('OpenAI generation failure:', error.response?.data || error.message);
      throw new Error(`OpenAI Provider Error: ${error.message}`);
    }
  }

  private generateMockResponse(request: LlmRequest): Promise<LlmResponse> {
    return new Promise((resolve) => {
      setTimeout(() => {
        const mockItinerary = {
          destination: 'Tokyo, Japan',
          durationDays: 3,
          tripPlan: [
            {
              day: 1,
              title: 'Modern Marvels & City Lights',
              activities: [
                { time: '09:00 AM', name: 'Explore Shibuya Crossing', cost: 'Free', notes: 'Walk the worlds busiest crossing' },
                { time: '01:00 PM', name: 'Lunch at Harajuku Takeshita St', cost: '$15', notes: 'Try famous sweet crepes' },
                { time: '06:00 PM', name: 'Observation deck at Tokyo Metropolitan Gov Bldg', cost: 'Free', notes: 'Stunning panoramic views' }
              ]
            },
            {
              day: 2,
              title: 'Historic Shrines & Gardens',
              activities: [
                { time: '08:00 AM', name: 'Meiji Jingu Shrine tour', cost: 'Free', notes: 'Serene forest walk' },
                { time: '02:00 PM', name: 'Walk Shinjuku Gyoen National Garden', cost: '$5', notes: 'Beautiful traditional landscape' }
              ]
            },
            {
              day: 3,
              title: 'Tech & Anime Pilgrimage',
              activities: [
                { time: '10:00 AM', name: 'Shopping in Akihabara Electric Town', cost: 'Varies', notes: 'Ultimate hub for gaming & anime' },
                { time: '07:00 PM', name: 'Sushi Dinner in Ginza district', cost: '$60', notes: 'Premium chef selected dining' }
              ]
            }
          ],
          enrichedData: {
            localWeatherForecast: '18°C, Partially Cloudy',
            suggestedPackingList: ['Comfortable walking shoes', 'Plug adapter type A', 'Suica cash card'],
            travelWarning: 'High crowd volumes around Shibuya stations between 5pm-7pm'
          }
        };

        resolve({
          content: JSON.stringify(mockItinerary),
          model: 'mock-gpt-4o',
          usage: {
            promptTokens: 100,
            completionTokens: 250,
            totalTokens: 350,
          },
        });
      }, 500);
    });
  }
}
