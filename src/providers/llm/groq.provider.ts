import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BaseLlmProvider, LlmRequest, LlmResponse } from '../base/llm.provider';
import axios from 'axios';

@Injectable()
export class GroqProvider extends BaseLlmProvider {
  private readonly logger = new Logger(GroqProvider.name);
  private apiKey: string;

  constructor(private readonly configService: ConfigService) {
    super();
    // Support either direct env or NestJS Config Service
    this.apiKey =
      this.configService.get<string>('FALLBACK_GROQ_API_KEY', '') ||
      process.env.FALLBACK_GROQ_API_KEY ||
      '';
  }

  getName(): string {
    return 'groq';
  }

  async generate(request: LlmRequest): Promise<LlmResponse> {
    const model = 'llama-3.3-70b-versatile';
    this.logger.log(
      `Executing fallback LLM generation via Groq model: ${model}`,
    );

    if (!this.apiKey) {
      const nodeEnv =
        this.configService.get<string>('NODE_ENV', 'development') ||
        process.env.NODE_ENV ||
        'development';
      if (nodeEnv === 'production') {
        throw new Error(
          'FALLBACK_GROQ_API_KEY is not configured in the production environment variables',
        );
      }
      this.logger.warn(
        'FALLBACK_GROQ_API_KEY is not defined! Falling back to simulated Travel AI response...',
      );
      return this.generateMockResponse(request);
    }

    try {
      const messages: any[] = [];
      if (request.systemPrompt) {
        messages.push({ role: 'system', content: request.systemPrompt });
      }
      messages.push({ role: 'user', content: request.userPrompt });

      const response = await axios.post(
        'https://api.groq.com/openai/v1/chat/completions',
        {
          model,
          messages,
          temperature: request.temperature ?? 0.5,
          max_tokens: request.maxTokens ?? 4000,
          response_format:
            request.responseFormat === 'json'
              ? { type: 'json_object' }
              : undefined,
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
      this.logger.error(
        'Groq generation failure:',
        error.response?.data || error.message,
      );
      throw new Error(`Groq Provider Error: ${error.message}`);
    }
  }

  private generateMockResponse(request: LlmRequest): Promise<LlmResponse> {
    return new Promise((resolve) => {
      setTimeout(() => {
        // CURATED premium fallback itinerary
        const mockItinerary = {
          summary: {
            destination: 'Manali, Himachal Pradesh',
            tripType: '4-Day Round Trip from Ghaziabad',
            totalDays: 4,
            totalPersons: 2,
            travelers: [
              { sex: 'M', age: 21 },
              { sex: 'M', age: 22 },
            ],
            experienceType: 'Adventure & Mountain Exploration',
            baseCurrency: 'INR',
            imageUrl:
              'https://images.unsplash.com/photo-1605649487212-4f7ccdb04934?q=80&w=1080',
          },
          days: [
            {
              day: 1,
              date: '15/06/2026',
              title: 'The Ascent: Journey to the Valley of Gods',
              route: 'Ghaziabad, Chandigarh, Manali',
              distance: '540 km',
              travelTime: '12.5 hrs',
              altitudeSeaLevel: '2050m',
              predictedWeather: {
                conditions: 'Clear Skies / Cool Breeze',
                temperatureHigh: '22°C',
                temperatureLow: '12°C',
              },
              transportDetails: {
                type: 'car (Rented)',
                subType: 'Mahindra Thar',
                flightOrTrainNumber: 'Not Applicable',
                departureTime: '04:30 AM, 15/06/2026',
                arrivalTime: '05:00 PM, 15/06/2026',
              },
              destinationImageUrl:
                'https://images.unsplash.com/photo-1596394516093-501ba68a0ba6?q=80&w=1080',
              accommodation: {
                hotelName: 'Zostel Manali (Old Manali)',
                bookingPlatform: 'Zostel.com',
                bookingLink: 'https://www.zostel.com/zostel/manali/',
                pricePerPersonINR: 1600,
                whyRecommended:
                  'Vibrant backpacker vibe, safe parking for the SUV, and walking distance to cafes.',
              },
              experienceDescription:
                'Start your journey before dawn to beat the Delhi NCR traffic.',
              dailyPacing: 'Moderate',
              dailyActivities: [
                {
                  name: 'Old Manali Cafe Crawl',
                  detail:
                    'Explore the cobblestone streets and eat at Cafe 1947.',
                  estimatedINR: 1200,
                  imageUrl:
                    'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?q=80&w=1080',
                },
              ],
              costBreakdown: {
                transportBaseINR: 3500,
                fuelINR: 4500,
                tollsINR: 650,
                accommodationINR: 1600,
                activitiesINR: 1200,
                foodINR: { breakfast: 300, lunch: 700, dinner: 1200 },
              },
            },
          ],
          costBreakdownFull: {
            interCityTransportINR: 14000,
            intraCityTransportINR: 0,
            stayINR: 9600,
            foodBreakdownINR: {
              breakfast: 1100,
              lunch: 2800,
              dinner: 3300,
              snacksAndDrinks: 1500,
            },
            activitiesINR: 4350,
            hiddenCostsINR: {
              fuelEstimatedTotal: 11300,
              tollsAndTaxes: 1300,
              tips: 500,
              permits: 600,
            },
          },
          totalCostSummary: {
            minimumCostINR: 35000,
            safeCostINR: 40000,
            maxCostINR: 45000,
            perPersonINR: 20000,
          },
          travelInsights: {
            bestExperiences: ['Driving 4x4 Thar through Rohtang snow walls.'],
            hiddenGems: ['Sethan Village off-beat igloo experience.'],
            cautionPoints: ['Altitude sickness; stay hydrated.'],
            bestTimeToVisit: 'October to June',
            sustainabilityTips: ['Do not litter at high altitudes.'],
          },
          logistics: {
            packingList: ['Thermals', 'Heavy winter jacket'],
            healthAndSafety: ['Motion sickness pills', 'Emergency car tools'],
          },
          survivalGuide: {
            localAppsToDownload: ['Zoomcar', 'AccuWeather'],
            emergencyContacts: ['Manali Police: 01902-252326'],
            culturalNorms: ['Respect local traditions near temples.'],
            scamWarnings: ['Fake saffron sellers in market.'],
          },
        };

        resolve({
          content: JSON.stringify(mockItinerary),
          model: 'mock-llama-3.3-70b-versatile',
          usage: {
            promptTokens: 120,
            completionTokens: 380,
            totalTokens: 500,
          },
        });
      }, 500);
    });
  }
}
