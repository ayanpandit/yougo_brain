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
    this.apiKey =
      this.configService.get<string>('GEMINI_API_KEY', '') ||
      process.env.GEMINI_API_KEY ||
      '';
  }

  getName(): string {
    return 'gemini';
  }

  async generate(request: LlmRequest): Promise<LlmResponse> {
    const model = 'gemini-2.5-flash';
    this.logger.log(`Executing LLM generation via Gemini model: ${model}`);

    if (!this.apiKey) {
      this.logger.warn(
        'GEMINI_API_KEY is not defined! Falling back to simulated Travel AI response...',
      );
      return this.generateMockResponse(request);
    }

    const apiVersions = ['v1beta', 'v1'];
    let lastError: any = null;

    for (const apiVersion of apiVersions) {
      try {
        this.logger.log(
          `Attempting Gemini generateContent via ${apiVersion} endpoint...`,
        );
        const contents = [];
        contents.push({
          parts: [
            {
              text: `${request.systemPrompt ? request.systemPrompt + '\n\n' : ''}${request.userPrompt}`,
            },
          ],
        });

        const response = await axios.post(
          `https://generativelanguage.googleapis.com/${apiVersion}/models/${model}:generateContent?key=${this.apiKey}`,
          {
            contents,
            generationConfig: {
              temperature: request.temperature ?? 0.7,
              maxOutputTokens: request.maxTokens ?? 2000,
              responseMimeType:
                request.responseFormat === 'json'
                  ? 'application/json'
                  : undefined,
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
        this.logger.log(`Gemini generation via ${apiVersion} succeeded!`);

        return {
          content,
          model,
          usage: {
            promptTokens: response.data.usageMetadata?.promptTokenCount || 0,
            completionTokens:
              response.data.usageMetadata?.candidatesTokenCount || 0,
            totalTokens: response.data.usageMetadata?.totalTokenCount || 0,
          },
        };
      } catch (error: any) {
        lastError = error;
        this.logger.warn(
          `Gemini generation failed on ${apiVersion} endpoint: ${
            error.response?.data?.error?.message || error.message
          }`,
        );
      }
    }

    // Ultimate self-healing retry to the brand new flagship model: gemini-2.5-flash
    try {
      this.logger.log(
        'Attempting ultimate self-healing fallback to gemini-2.5-flash on stable v1...',
      );
      const contents = [
        {
          parts: [
            {
              text: `${request.systemPrompt ? request.systemPrompt + '\n\n' : ''}${request.userPrompt}`,
            },
          ],
        },
      ];

      const response = await axios.post(
        `https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=${this.apiKey}`,
        {
          contents,
          generationConfig: {
            temperature: request.temperature ?? 0.7,
            maxOutputTokens: request.maxTokens ?? 2000,
            responseMimeType:
              request.responseFormat === 'json'
                ? 'application/json'
                : undefined,
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
      this.logger.log('Gemini 2.5 Flash fallback succeeded!');

      return {
        content,
        model: 'gemini-2.5-flash',
        usage: {
          promptTokens: response.data.usageMetadata?.promptTokenCount || 0,
          completionTokens:
            response.data.usageMetadata?.candidatesTokenCount || 0,
          totalTokens: response.data.usageMetadata?.totalTokenCount || 0,
        },
      };
    } catch (fallbackError: any) {
      this.logger.error(
        'Gemini ultimate fallback to 2.5-flash failed too:',
        fallbackError.response?.data || fallbackError.message,
      );
    }

    throw new Error(
      `Gemini Provider Error: ${lastError.response?.data?.error?.message || lastError.message}`,
    );
  }

  private generateMockResponse(request: LlmRequest): Promise<LlmResponse> {
    return new Promise((resolve) => {
      setTimeout(() => {
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
            {
              day: 2,
              date: '16/06/2026',
              title: 'Ancient Temples & Valley Views',
              route: 'Old Manali, Hadimba Temple, Solang Valley, Old Manali',
              distance: '35 km',
              travelTime: '1.5 hrs',
              altitudeSeaLevel: '2560m',
              predictedWeather: {
                conditions: 'Partly Cloudy',
                temperatureHigh: '20°C',
                temperatureLow: '10°C',
              },
              transportDetails: {
                type: 'car (Rented)',
                subType: 'Mahindra Thar',
                flightOrTrainNumber: 'Not Applicable',
                departureTime: '09:30 AM, 16/06/2026',
                arrivalTime: '06:00 PM, 16/06/2026',
              },
              destinationImageUrl:
                'https://images.unsplash.com/photo-1593118925567-33a817454807?q=80&w=1080',
              accommodation: {
                hotelName: 'Zostel Manali (Old Manali)',
                bookingPlatform: 'Not Applicable',
                bookingLink: 'Not Applicable',
                pricePerPersonINR: 1600,
                whyRecommended: 'Continuing stay.',
              },
              experienceDescription:
                'After breakfast, drive up to Hadimba Temple and Solang Valley.',
              dailyPacing: 'Hectic',
              dailyActivities: [
                {
                  name: 'Hadimba Devi Temple',
                  detail: 'Explore ancient architecture.',
                  estimatedINR: 50,
                  imageUrl:
                    'https://images.unsplash.com/photo-1626296715093-6110f01a3556?q=80&w=1080',
                },
              ],
              costBreakdown: {
                transportBaseINR: 3500,
                fuelINR: 800,
                tollsINR: 0,
                accommodationINR: 1600,
                activitiesINR: 2550,
                foodINR: { breakfast: 300, lunch: 800, dinner: 900 },
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
          model: 'mock-gemini-1.5-flash',
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
