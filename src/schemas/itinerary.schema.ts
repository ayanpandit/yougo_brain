import { z } from 'zod';

export const travelerSchema = z.object({
  sex: z.enum(['M', 'F', 'any']).or(z.string()),
  age: z.number().int().positive(),
});

export const summarySchema = z.object({
  destination: z.string(),
  tripType: z.string(),
  totalDays: z.number().int().positive(),
  totalPersons: z.number().int().positive(),
  travelers: z.array(travelerSchema),
  experienceType: z.string(),
  baseCurrency: z.string().default('INR'),
  imageUrl: z.string(),
});

export const predictedWeatherSchema = z.object({
  conditions: z.string(),
  temperatureHigh: z.string(),
  temperatureLow: z.string(),
});

export const transportDetailsSchema = z.object({
  type: z.string(),
  subType: z.string(),
  flightOrTrainNumber: z.string(),
  departureTime: z.string(),
  arrivalTime: z.string(),
});

export const accommodationSchema = z.object({
  hotelName: z.string(),
  bookingPlatform: z.string(),
  bookingLink: z.string(),
  pricePerPersonINR: z.number(),
  whyRecommended: z.string(),
});

export const activityItemSchema = z.object({
  name: z.string(),
  detail: z.string(),
  estimatedINR: z.number(),
  imageUrl: z.string(),
});

export const dailyCostBreakdownSchema = z.object({
  transportBaseINR: z.number(),
  fuelINR: z.number(),
  tollsINR: z.number(),
  accommodationINR: z.number(),
  activitiesINR: z.number(),
  foodINR: z.object({
    breakfast: z.number(),
    lunch: z.number(),
    dinner: z.number(),
  }),
});

export const dayPlanSchema = z.object({
  day: z.number().int().positive(),
  date: z.string(),
  title: z.string(),
  route: z.string(),
  distance: z.string(),
  travelTime: z.string(),
  altitudeSeaLevel: z.string(),
  predictedWeather: predictedWeatherSchema,
  transportDetails: transportDetailsSchema,
  destinationImageUrl: z.string(),
  accommodation: accommodationSchema,
  experienceDescription: z.string(),
  dailyPacing: z.string(),
  dailyActivities: z.array(activityItemSchema),
  costBreakdown: dailyCostBreakdownSchema,
});

export const foodBreakdownFullSchema = z.object({
  breakfast: z.number(),
  lunch: z.number(),
  dinner: z.number(),
  snacksAndDrinks: z.number(),
});

export const hiddenCostsSchema = z.object({
  fuelEstimatedTotal: z.number(),
  tollsAndTaxes: z.number(),
  tips: z.number(),
  permits: z.number(),
});

export const costBreakdownFullSchema = z.object({
  interCityTransportINR: z.number(),
  intraCityTransportINR: z.number(),
  stayINR: z.number(),
  foodBreakdownINR: foodBreakdownFullSchema,
  activitiesINR: z.number(),
  hiddenCostsINR: hiddenCostsSchema,
});

export const totalCostSummarySchema = z.object({
  minimumCostINR: z.number(),
  safeCostINR: z.number(),
  maxCostINR: z.number(),
  perPersonINR: z.number(),
});

export const travelInsightsSchema = z.object({
  bestExperiences: z.array(z.string()),
  hiddenGems: z.array(z.string()),
  cautionPoints: z.array(z.string()),
  bestTimeToVisit: z.string(),
  sustainabilityTips: z.array(z.string()),
});

export const logisticsSchema = z.object({
  packingList: z.array(z.string()),
  healthAndSafety: z.array(z.string()),
});

export const survivalGuideSchema = z.object({
  localAppsToDownload: z.array(z.string()),
  emergencyContacts: z.array(z.string()),
  culturalNorms: z.array(z.string()),
  scamWarnings: z.array(z.string()),
});

export const itinerarySchema = z.object({
  summary: summarySchema,
  days: z.array(dayPlanSchema),
  costBreakdownFull: costBreakdownFullSchema,
  totalCostSummary: totalCostSummarySchema,
  travelInsights: travelInsightsSchema,
  logistics: logisticsSchema,
  survivalGuide: survivalGuideSchema,
});

export type Itinerary = z.infer<typeof itinerarySchema>;
export type DayPlan = z.infer<typeof dayPlanSchema>;
export type ActivityItem = z.infer<typeof activityItemSchema>;
export type Traveler = z.infer<typeof travelerSchema>;

// Self-healing default objects
export const defaultActivityTemplate = {
  name: 'Not Applicable',
  detail: 'Not Applicable',
  estimatedINR: 0,
  imageUrl: 'Not Applicable',
};

export const defaultDayPlanTemplate = {
  day: 1,
  date: 'Not Applicable',
  title: 'Not Applicable',
  route: 'Not Applicable',
  distance: 'Not Applicable',
  travelTime: 'Not Applicable',
  altitudeSeaLevel: 'Not Applicable',
  predictedWeather: {
    conditions: 'Not Applicable',
    temperatureHigh: 'Not Applicable',
    temperatureLow: 'Not Applicable',
  },
  transportDetails: {
    type: 'Not Applicable',
    subType: 'Not Applicable',
    flightOrTrainNumber: 'Not Applicable',
    departureTime: 'Not Applicable',
    arrivalTime: 'Not Applicable',
  },
  destinationImageUrl: 'Not Applicable',
  accommodation: {
    hotelName: 'Not Applicable',
    bookingPlatform: 'Not Applicable',
    bookingLink: 'Not Applicable',
    pricePerPersonINR: 0,
    whyRecommended: 'Not Applicable',
  },
  experienceDescription: 'Not Applicable',
  dailyPacing: 'Not Applicable',
  dailyActivities: [],
  costBreakdown: {
    transportBaseINR: 0,
    fuelINR: 0,
    tollsINR: 0,
    accommodationINR: 0,
    activitiesINR: 0,
    foodINR: {
      breakfast: 0,
      lunch: 0,
      dinner: 0,
    },
  },
};

export const defaultItineraryTemplate = {
  summary: {
    destination: 'Not Applicable',
    tripType: 'Not Applicable',
    totalDays: 1,
    totalPersons: 1,
    travelers: [],
    experienceType: 'Not Applicable',
    baseCurrency: 'INR',
    imageUrl: 'Not Applicable',
  },
  days: [],
  costBreakdownFull: {
    interCityTransportINR: 0,
    intraCityTransportINR: 0,
    stayINR: 0,
    foodBreakdownINR: {
      breakfast: 0,
      lunch: 0,
      dinner: 0,
      snacksAndDrinks: 0,
    },
    activitiesINR: 0,
    hiddenCostsINR: {
      fuelEstimatedTotal: 0,
      tollsAndTaxes: 0,
      tips: 0,
      permits: 0,
    },
  },
  totalCostSummary: {
    minimumCostINR: 0,
    safeCostINR: 0,
    maxCostINR: 0,
    perPersonINR: 0,
  },
  travelInsights: {
    bestExperiences: [],
    hiddenGems: [],
    cautionPoints: [],
    bestTimeToVisit: 'Not Applicable',
    sustainabilityTips: [],
  },
  logistics: {
    packingList: [],
    healthAndSafety: [],
  },
  survivalGuide: {
    localAppsToDownload: [],
    emergencyContacts: [],
    culturalNorms: [],
    scamWarnings: [],
  },
};

function deepMerge(target: any, source: any): any {
  if (source === null || source === undefined) return target;

  if (Array.isArray(source)) {
    return source;
  }

  if (typeof source === 'object' && typeof target === 'object') {
    const merged = { ...target };
    for (const key of Object.keys(target)) {
      if (key in source) {
        merged[key] = deepMerge(target[key], source[key]);
      }
    }
    // Pull any extra keys
    for (const key of Object.keys(source)) {
      if (!(key in target)) {
        merged[key] = source[key];
      }
    }
    return merged;
  }
  return source;
}

export function repairItinerary(rawParsed: any): Itinerary {
  const repaired = deepMerge(defaultItineraryTemplate, rawParsed);

  if (Array.isArray(repaired.days)) {
    repaired.days = repaired.days.map((dayPlan: any, index: number) => {
      const mergedDay = deepMerge(defaultDayPlanTemplate, dayPlan);
      mergedDay.day = dayPlan.day ?? index + 1;

      if (Array.isArray(mergedDay.dailyActivities)) {
        mergedDay.dailyActivities = mergedDay.dailyActivities.map(
          (activity: any) => {
            return deepMerge(defaultActivityTemplate, activity);
          },
        );
      }
      return mergedDay;
    });
  }

  return repaired as Itinerary;
}
