import { IsString, IsNotEmpty, IsNumber, Min, Max, IsOptional } from 'class-validator';

export class GenerateDto {
  @IsString()
  @IsNotEmpty({ message: 'Destination location query is required' })
  destination: string;

  @IsNumber({}, { message: 'Duration must be a valid number' })
  @Min(1, { message: 'Duration must be at least 1 day' })
  @Max(30, { message: 'Duration cannot exceed 30 days' })
  durationDays: number;

  @IsString()
  @IsOptional()
  preferences?: string;
}
