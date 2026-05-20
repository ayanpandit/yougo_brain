import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

export interface RouteDetails {
  distance: string; // e.g. "540 km"
  travelTime: string; // e.g. "12.5 hrs"
  rawDistanceKm: number;
  rawDurationHours: number;
}

@Injectable()
export class OpenRouteServiceProvider {
  private readonly logger = new Logger(OpenRouteServiceProvider.name);
  private apiKey: string;

  constructor(private readonly configService: ConfigService) {
    this.apiKey =
      this.configService.get<string>('OPEN_ROUTE_SERVICE_KEY', '') ||
      process.env.OPEN_ROUTE_SERVICE_KEY ||
      '';
  }

  async getDrivingDirections(
    startLat: number,
    startLng: number,
    endLat: number,
    endLng: number,
  ): Promise<RouteDetails> {
    this.logger.log(
      `Fetching route directions from OpenRouteService for: (${startLat}, ${startLng}) -> (${endLat}, ${endLng})`,
    );

    if (!this.apiKey) {
      this.logger.warn(
        'OPEN_ROUTE_SERVICE_KEY is not defined! Falling back to Haversine geometric driving route calculation...',
      );
      return this.calculateHaversineRoute(startLat, startLng, endLat, endLng);
    }

    try {
      // OpenRouteService expects coordinates in longitude,latitude order!
      const response = await axios.get(
        'https://api.openrouteservice.org/v2/directions/driving-car',
        {
          params: {
            api_key: this.apiKey,
            start: `${startLng},${startLat}`,
            end: `${endLng},${endLat}`,
          },
          timeout: 8000, // 8s timeout
        },
      );

      const route = response.data.features?.[0]?.properties?.summary;
      if (!route) {
        throw new Error('No route features found in OpenRouteService payload');
      }

      const distanceKm = Math.round(route.distance / 1000);
      const durationHours = parseFloat((route.duration / 3600).toFixed(1));

      return {
        distance: `${distanceKm} km`,
        travelTime: `${durationHours} hrs`,
        rawDistanceKm: distanceKm,
        rawDurationHours: durationHours,
      };
    } catch (error: any) {
      this.logger.error(
        `OpenRouteService API route query failed: ${error.message}. Performing geometric driving estimation...`,
      );
      return this.calculateHaversineRoute(startLat, startLng, endLat, endLng);
    }
  }

  private calculateHaversineRoute(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number,
  ): RouteDetails {
    // Standard Haversine formula
    const R = 6371; // Radius of earth in km
    const dLat = this.deg2rad(lat2 - lat1);
    const dLon = this.deg2rad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.deg2rad(lat1)) *
        Math.cos(this.deg2rad(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const straightDistance = R * c;

    // Apply standard winding coefficient of 1.3 to estimate mountain / road detour factor
    const roadDistanceKm = Math.round(straightDistance * 1.3);

    // Assume an average driving speed of 50 km/h for standard city/mountain mixed routes
    const roadDurationHours = parseFloat((roadDistanceKm / 50).toFixed(1));

    return {
      distance: `${roadDistanceKm} km`,
      travelTime: `${roadDurationHours} hrs`,
      rawDistanceKm: roadDistanceKm,
      rawDurationHours: roadDurationHours,
    };
  }

  private deg2rad(deg: number): number {
    return deg * (Math.PI / 180);
  }
}
