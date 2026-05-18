import { z } from 'zod';

export const activitySchema = z.object({
  time: z.string(),
  name: z.string(),
  cost: z.string(),
  notes: z.string(),
});

export const dayPlanSchema = z.object({
  day: z.number().int().positive(),
  title: z.string(),
  activities: z.array(activitySchema),
});

export const enrichedDataSchema = z.object({
  localWeatherForecast: z.string(),
  suggestedPackingList: z.array(z.string()),
  travelWarning: z.string().default('None'),
});

export const itinerarySchema = z.object({
  destination: z.string(),
  durationDays: z.number().int().positive(),
  tripPlan: z.array(dayPlanSchema),
  enrichedData: enrichedDataSchema,
});

export type Itinerary = z.infer<typeof itinerarySchema>;
export type DayPlan = z.infer<typeof dayPlanSchema>;
export type Activity = z.infer<typeof activitySchema>;
