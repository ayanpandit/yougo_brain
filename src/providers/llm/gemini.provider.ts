import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BaseLlmProvider, LlmRequest, LlmResponse } from '../base/llm.provider';
import axios from 'axios';

@Injectable()
export class GeminiProvider extends BaseLlmProvider {
  private readonly logger = new Logger(GeminiProvider.name);
  private apiKey: string;

  constructor(private readonly configService: ConfigService) {
    super();
    this.apiKey = this.configService.get<string>('GEMINI_API_KEY', '');
  }

  getName(): string {
    return 'gemini';
  }

  async generate(request: LlmRequest): Promise<LlmResponse> {
    const model = 'gemini-1.5-flash';
    this.logger.log(`Executing LLM generation via Gemini model: ${model}`);

    if (!this.apiKey) {
      this.logger.warn('GEMINI_API_KEY is not defined! Falling back to simulated Travel AI response...');
      return this.generateMockResponse(request);
    }

    try {
      const contents = [];
      if (request.systemPrompt) {
        // System instruction is placed separately in Gemini request body
      }
      contents.push({
        parts: [{ text: `${request.systemPrompt ? request.systemPrompt + '\n\n' : ''}${request.userPrompt}` }],
      });

      const response = await axios.post(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${this.apiKey}`,
        {
          contents,
          generationConfig: {
            temperature: request.temperature ?? 0.7,
            maxOutputTokens: request.maxTokens ?? 2000,
            responseMimeType: request.responseFormat === 'json' ? 'application/json' : undefined,
          },
        },
        {
          headers: {
            'Content-Type': 'application/json',
          },
          timeout: 30000,
        },
      );

      const content = response.data.candidates[0].content.parts[0].text;

      return {
        content,
        model,
        usage: {
          promptTokens: response.data.usageMetadata?.promptTokenCount || 0,
          completionTokens: response.data.usageMetadata?.candidatesTokenCount || 0,
          totalTokens: response.data.usageMetadata?.totalTokenCount || 0,
        },
      };
    } catch (error: any) {
      this.logger.error('Gemini generation failure:', error.response?.data || error.message);
      throw new Error(`Gemini Provider Error: ${error.message}`);
    }
  }

  private generateMockResponse(request: LlmRequest): Promise<LlmResponse> {
    // Return same mock format for consistent testing
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
          model: 'mock-gemini-1.5-flash',
          usage: {
            promptTokens: 80,
            completionTokens: 240,
            totalTokens: 320,
          },
        });
      }, 500);
    });
  }
}
