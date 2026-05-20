import {
  IsString,
  IsNotEmpty,
  IsNumber,
  Min,
  IsBoolean,
  IsArray,
  ValidateNested,
  IsOptional,
  IsEnum,
  IsInt,
} from 'class-validator';
import { Type } from 'class-transformer';

export class TripDetailsDto {
  @IsString()
  @IsNotEmpty({ message: 'Origin is required' })
  origin: string;

  @IsString()
  destination: string; // Can be an empty string if the AI should decide

  @IsString()
  @IsNotEmpty({ message: 'Start date (startDate) is required' })
  startDate: string;

  @IsInt()
  @Min(1, { message: 'Days must be at least 1' })
  days: number;

  @IsNumber()
  @Min(100, { message: 'Budget must be at least 100 INR' })
  budgetINR: number;

  @IsBoolean()
  isRoundTrip: boolean;
}

export class TravelerDto {
  @IsString()
  @IsEnum(['M', 'F', 'any', 'other'], {
    message: 'Sex must be M, F, any, or other',
  })
  sex: string;

  @IsInt()
  @Min(1, { message: 'Age must be positive' })
  age: number;
}

export class PartyCompositionDto {
  @IsInt()
  @Min(1, { message: 'Total persons must be at least 1' })
  totalPersons: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TravelerDto)
  travelers: TravelerDto[];
}

export class PreferencesDto {
  @IsString()
  @IsEnum(['veg', 'non_veg', 'any'], {
    message: 'Food preference must be veg, non_veg, or any',
  })
  food_preference: string;

  @IsString()
  @IsNotEmpty({ message: 'Travel style is required' })
  travel_style: string; // e.g., "adventure", "leisure", "cultural", "spiritual"

  @IsString()
  @IsEnum(['budget', 'moderate', 'luxury'], {
    message: 'Luxury level must be budget, moderate, or luxury',
  })
  luxury_level: string;
}

export class BikeMediumDto {
  @IsBoolean()
  selected: boolean;

  @IsOptional()
  @IsString()
  type?: string; // "normal_city", "sports", or "off_road"

  @IsOptional()
  @IsString()
  sharing?: string; // "individual" or "two_on_one"

  @IsOptional()
  @IsString()
  ownership?: string; // "rented" or "personal"
}

export class CarMediumDto {
  @IsBoolean()
  selected: boolean;

  @IsOptional()
  @IsString()
  type?: string; // "suv", "sedan", or "hatchback"

  @IsOptional()
  @IsString()
  ownership?: string; // "rented" or "personal"
}

export class TrainMediumDto {
  @IsBoolean()
  selected: boolean;

  @IsOptional()
  @IsString()
  class?: string; // "1AC", "2AC", "3AC", "sleeper", "chair_car", or "general"
}

export class FlightMediumDto {
  @IsBoolean()
  selected: boolean;

  @IsOptional()
  @IsString()
  class?: string; // "economy", "business", or "first"
}

export class BusMediumDto {
  @IsBoolean()
  selected: boolean;

  @IsOptional()
  @IsString()
  class?: string; // "ac_sleeper", "ac_seater", "non_ac", or "volvo"
}

export class TravelMediumDto {
  @IsBoolean()
  mixed_best_suitable: boolean;

  @ValidateNested()
  @Type(() => BikeMediumDto)
  bike: BikeMediumDto;

  @ValidateNested()
  @Type(() => CarMediumDto)
  car: CarMediumDto;

  @ValidateNested()
  @Type(() => TrainMediumDto)
  train: TrainMediumDto;

  @ValidateNested()
  @Type(() => FlightMediumDto)
  flights: FlightMediumDto;

  @ValidateNested()
  @Type(() => BusMediumDto)
  bus: BusMediumDto;
}

export class GenerateDto {
  @ValidateNested()
  @Type(() => TripDetailsDto)
  trip_details: TripDetailsDto;

  @ValidateNested()
  @Type(() => PartyCompositionDto)
  party_composition: PartyCompositionDto;

  @ValidateNested()
  @Type(() => PreferencesDto)
  preferences: PreferencesDto;

  @ValidateNested()
  @Type(() => TravelMediumDto)
  travel_medium: TravelMediumDto;
}
