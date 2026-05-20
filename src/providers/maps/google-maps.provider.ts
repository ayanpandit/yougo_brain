import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BaseMapsProvider, LocationDetails } from '../base/maps.provider';
import axios from 'axios';

@Injectable()
export class GoogleMapsProvider extends BaseMapsProvider {
  private readonly logger = new Logger(GoogleMapsProvider.name);
  private apiKey: string;

  constructor(private readonly configService: ConfigService) {
    super();
    this.apiKey = this.configService.get<string>('GOOGLE_MAPS_API_KEY', '');
  }

  async searchLocation(query: string): Promise<LocationDetails> {
    this.logger.log(`Searching maps data for query: "${query}"`);

    if (!this.apiKey) {
      this.logger.warn(
        'GOOGLE_MAPS_API_KEY is not defined! Falling back to simulated GPS mapping...',
      );
      return this.getMockLocation(query);
    }

    try {
      const response = await axios.get(
        'https://maps.googleapis.com/maps/api/geocode/json',
        {
          params: {
            address: query,
            key: this.apiKey,
          },
          timeout: 10000,
        },
      );

      if (response.data.status !== 'OK') {
        throw new Error(
          `Google Maps API error status: ${response.data.status}`,
        );
      }

      const result = response.data.results[0];
      return {
        formattedAddress: result.formatted_address,
        latitude: result.geometry.location.lat,
        longitude: result.geometry.location.lng,
        placeId: result.place_id,
      };
    } catch (error: any) {
      this.logger.error(
        `Google Maps geocoding failure for "${query}":`,
        error.message,
      );
      throw new Error(`Maps Provider Error: ${error.message}`);
    }
  }

  private getMockLocation(query: string): LocationDetails {
    // Generate deterministic coordinates for classic destinations
    const normalized = query.toLowerCase();

    if (normalized.includes('tokyo')) {
      return {
        formattedAddress: 'Tokyo, Japan',
        latitude: 35.6762,
        longitude: 139.6503,
        placeId: 'chij5z9at-tlggars1r6dpl2tfa',
      };
    }
    if (normalized.includes('paris')) {
      return {
        formattedAddress: 'Paris, France',
        latitude: 48.8566,
        longitude: 2.3522,
        placeId: 'chij0w82t_jxbkgrzqy3vy7t9f0',
      };
    }
    if (normalized.includes('london')) {
      return {
        formattedAddress: 'London, UK',
        latitude: 51.5074,
        longitude: -0.1278,
        placeId: 'chijdd4hrwobudgr-3w_vgcxny8',
      };
    }

    return {
      formattedAddress: `${query.charAt(0).toUpperCase() + query.slice(1)}, Simulated Region`,
      latitude: 40.7128,
      longitude: -74.006, // Default NYC
      placeId: 'simulated-place-id',
    };
  }
}
