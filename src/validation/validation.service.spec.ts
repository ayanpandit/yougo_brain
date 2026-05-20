import { Test, TestingModule } from '@nestjs/testing';
import { ValidationService } from './validation.service';
import { itinerarySchema } from '../schemas/itinerary.schema';

describe('ValidationService (Repair-Ready Parser)', () => {
  let service: ValidationService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ValidationService],
    }).compile();

    service = module.get<ValidationService>(ValidationService);
  });

  const getCleanMockItinerary = (overrides = {}) => {
    return {
      summary: {
        destination: 'Rome, Italy',
        tripType: '2-Day Escape',
        totalDays: 2,
        totalPersons: 1,
        travelers: [{ sex: 'M', age: 21 }],
        experienceType: 'Sightseeing',
        baseCurrency: 'INR',
        imageUrl: 'https://images.unsplash.com/photo-1552832230-c0197dd311b5',
      },
      days: [
        {
          day: 1,
          date: '15/06/2026',
          title: 'Colosseum Day',
          route: 'Rome',
          distance: '10 km',
          travelTime: '1 hr',
          altitudeSeaLevel: '20m',
          predictedWeather: {
            conditions: 'Sunny',
            temperatureHigh: '24°C',
            temperatureLow: '15°C',
          },
          transportDetails: {
            type: 'walk',
            subType: 'Not Applicable',
            flightOrTrainNumber: 'Not Applicable',
            departureTime: 'Not Applicable',
            arrivalTime: 'Not Applicable',
          },
          destinationImageUrl:
            'https://images.unsplash.com/photo-1552832230-c0197dd311b5',
          accommodation: {
            hotelName: 'Hotel Rome',
            bookingPlatform: 'Booking.com',
            bookingLink: 'https://booking.com',
            pricePerPersonINR: 4000,
            whyRecommended: 'Location',
          },
          experienceDescription: 'Explore ancient history.',
          dailyPacing: 'Moderate',
          dailyActivities: [
            {
              name: 'Colosseum Walkthrough',
              detail: 'Skip-the-line walkthrough',
              estimatedINR: 1800,
              imageUrl:
                'https://images.unsplash.com/photo-1552832230-c0197dd311b5',
            },
          ],
          costBreakdown: {
            transportBaseINR: 0,
            fuelINR: 0,
            tollsINR: 0,
            accommodationINR: 4000,
            activitiesINR: 1800,
            foodINR: { breakfast: 200, lunch: 500, dinner: 800 },
          },
        },
      ],
      costBreakdownFull: {
        interCityTransportINR: 0,
        intraCityTransportINR: 0,
        stayINR: 4000,
        foodBreakdownINR: {
          breakfast: 200,
          lunch: 500,
          dinner: 800,
          snacksAndDrinks: 200,
        },
        activitiesINR: 1800,
        hiddenCostsINR: {
          fuelEstimatedTotal: 0,
          tollsAndTaxes: 0,
          tips: 0,
          permits: 0,
        },
      },
      totalCostSummary: {
        minimumCostINR: 6000,
        safeCostINR: 7000,
        maxCostINR: 8000,
        perPersonINR: 7000,
      },
      travelInsights: {
        bestExperiences: ['Colosseum'],
        hiddenGems: ['Trastevere alleys'],
        cautionPoints: ['Pickpockets'],
        bestTimeToVisit: 'April-June',
        sustainabilityTips: ['Use public water fountains'],
      },
      logistics: {
        packingList: ['Sunscreen', 'Comfortable walking shoes'],
        healthAndSafety: ['Stay hydrated'],
      },
      survivalGuide: {
        localAppsToDownload: ['Citymapper'],
        emergencyContacts: ['112'],
        culturalNorms: ['No tips required'],
        scamWarnings: ['Gladiator actors charging for photos'],
      },
      ...overrides,
    };
  };

  it('should successfully parse and validate a perfectly clean JSON string', () => {
    const cleanJson = JSON.stringify(getCleanMockItinerary());

    const parsed = service.parseAndValidate(cleanJson, itinerarySchema);
    expect(parsed.summary.destination).toBe('Rome, Italy');
    expect(parsed.summary.totalDays).toBe(2);
  });

  it('should strip markdown markers and parse successfully', () => {
    const markdownJson = `
\`\`\`json
${JSON.stringify(getCleanMockItinerary())}
\`\`\`
    `.trim();

    const parsed = service.parseAndValidate(markdownJson, itinerarySchema);
    expect(parsed.summary.destination).toBe('Rome, Italy');
  });

  it('should repair trailing commas inside lists and objects and parse successfully', () => {
    const rawItinerary = getCleanMockItinerary();
    let jsonStr = JSON.stringify(rawItinerary);

    // 1. Replace array end to have a trailing comma: ["Colosseum"] -> ["Colosseum",]
    jsonStr = jsonStr.replace(
      '"bestExperiences":["Colosseum"]',
      '"bestExperiences":["Colosseum",]',
    );
    // 2. Replace summary object end to have a trailing comma: ...imageUrl":"..."} -> ...imageUrl":"...",}
    jsonStr = jsonStr.replace(
      '"imageUrl":"https://images.unsplash.com/photo-1552832230-c0197dd311b5"}',
      '"imageUrl":"https://images.unsplash.com/photo-1552832230-c0197dd311b5",}',
    );

    const parsed = service.parseAndValidate(jsonStr, itinerarySchema);
    expect(parsed.summary.destination).toBe('Rome, Italy');
    expect(parsed.travelInsights.bestExperiences).toHaveLength(1);
  });

  it('should throw an error for completely broken JSON shapes that violate Zod schemas', () => {
    const rawItinerary = getCleanMockItinerary();
    // Invalidate totalDays (needs positive integer)
    rawItinerary.summary.totalDays = -5;

    const brokenSchemaJson = JSON.stringify(rawItinerary);

    expect(() => {
      service.parseAndValidate(brokenSchemaJson, itinerarySchema);
    }).toThrow();
  });
});
