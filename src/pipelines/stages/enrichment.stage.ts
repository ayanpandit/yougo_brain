import { Injectable, Logger } from '@nestjs/common';
import { BaseMapsProvider, LocationDetails } from '../../providers/base/maps.provider';
import { BaseWeatherProvider, WeatherDetails } from '../../providers/base/weather.provider';

export interface EnrichmentOutput {
  location: LocationDetails;
  weather: WeatherDetails;
}

@Injectable()
export class EnrichmentStage {
  private readonly logger = new Logger(EnrichmentStage.name);

  constructor(
    private readonly mapsProvider: BaseMapsProvider,
    private readonly weatherProvider: BaseWeatherProvider,
  ) {}

  async execute(destination: string): Promise<EnrichmentOutput> {
    this.logger.log(`Executing Enrichment Stage for: "${destination}"`);

    // 1. Search Geocoding location details
    const location = await this.mapsProvider.searchLocation(destination);

    // 2. Fetch meteorological weather metrics using coordinates
    const weather = await this.weatherProvider.getWeather(location.latitude, location.longitude);

    this.logger.log(`Enrichment complete! Coordinates: (${location.latitude}, ${location.longitude}), Weather: ${weather.temperatureC}°C, ${weather.condition}`);
    
    return {
      location,
      weather,
    };
  }
}
