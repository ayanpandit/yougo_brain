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

  it('should successfully parse and validate a perfectly clean JSON string', () => {
    const cleanJson = JSON.stringify({
      destination: 'Rome, Italy',
      durationDays: 2,
      tripPlan: [
        {
          day: 1,
          title: 'Vatican & Colosseum tour',
          activities: [
            { time: '09:00 AM', name: 'Colosseum Walkthrough', cost: '€20', notes: 'Skip the line tickets pre-booked' }
          ]
        }
      ],
      enrichedData: {
        localWeatherForecast: '24°C, Sunny',
        suggestedPackingList: ['Sunglasses', 'Sunscreen'],
        travelWarning: 'Watch for pickpockets around Trevi Fountain'
      }
    });

    const parsed = service.parseAndValidate(cleanJson, itinerarySchema);
    expect(parsed.destination).toBe('Rome, Italy');
    expect(parsed.durationDays).toBe(2);
  });

  it('should strip markdown markers and parse successfully', () => {
    const markdownJson = `
\`\`\`json
{
  "destination": "Rome, Italy",
  "durationDays": 2,
  "tripPlan": [],
  "enrichedData": {
    "localWeatherForecast": "24°C, Sunny",
    "suggestedPackingList": [],
    "travelWarning": "None"
  }
}
\`\`\`
    `.trim();

    const parsed = service.parseAndValidate(markdownJson, itinerarySchema);
    expect(parsed.destination).toBe('Rome, Italy');
  });

  it('should repair trailing commas inside lists and objects and parse successfully', () => {
    const trailingCommaJson = `
{
  "destination": "Rome, Italy",
  "durationDays": 2,
  "tripPlan": [],
  "enrichedData": {
    "localWeatherForecast": "24°C, Sunny",
    "suggestedPackingList": [
      "item1",
      "item2",
    ],
    "travelWarning": "None",
  },
}
    `.trim();

    const parsed = service.parseAndValidate(trailingCommaJson, itinerarySchema);
    expect(parsed.destination).toBe('Rome, Italy');
    expect(parsed.enrichedData.suggestedPackingList).toHaveLength(2);
  });

  it('should throw an error for completely broken JSON shapes that violate Zod schemas', () => {
    const brokenSchemaJson = `
{
  "destination": "Rome, Italy",
  "durationDays": -5, // Violates Min(1)
  "tripPlan": [],
  "enrichedData": {
    "localWeatherForecast": "24°C, Sunny",
    "suggestedPackingList": []
  }
}
    `.trim();

    expect(() => {
      service.parseAndValidate(brokenSchemaJson, itinerarySchema);
    }).toThrow();
  });
});
