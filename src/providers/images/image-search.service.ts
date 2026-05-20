import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

@Injectable()
export class ImageSearchService {
  private readonly logger = new Logger(ImageSearchService.name);
  private unsplashKey: string;
  private pexelsKey: string;

  constructor(private readonly configService: ConfigService) {
    this.unsplashKey =
      this.configService.get<string>('UNSPLASH_API_KEY', '') ||
      process.env.UNSPLASH_API_KEY ||
      '';
    this.pexelsKey =
      this.configService.get<string>('PEXELS_API_KEY', '') ||
      process.env.PEXELS_API_KEY ||
      '';
  }

  async searchImage(query: string): Promise<string> {
    const cleanedQuery = query.trim();
    this.logger.log(`Searching media assets for query: "${cleanedQuery}"`);

    // 1. Try Unsplash first
    if (this.unsplashKey) {
      try {
        const response = await axios.get(
          'https://api.unsplash.com/search/photos',
          {
            params: {
              query: cleanedQuery,
              client_id: this.unsplashKey,
              per_page: 5,
              orientation: 'landscape',
            },
            timeout: 6000,
          },
        );

        const imageUrl = response.data.results?.[0]?.urls?.regular;
        if (imageUrl) {
          this.logger.log(`Asset found via Unsplash: ${imageUrl}`);
          return imageUrl;
        }
      } catch (error: any) {
        this.logger.warn(
          `Unsplash API query failed: ${error.message}. Trying Pexels...`,
        );
      }
    }

    // 2. Try Pexels fallback
    if (this.pexelsKey) {
      try {
        const response = await axios.get('https://api.pexels.com/v1/search', {
          headers: {
            Authorization: this.pexelsKey,
          },
          params: {
            query: cleanedQuery,
            per_page: 5,
            orientation: 'landscape',
          },
          timeout: 6000,
        });

        const imageUrl = response.data.photos?.[0]?.src?.large;
        if (imageUrl) {
          this.logger.log(`Asset found via Pexels: ${imageUrl}`);
          return imageUrl;
        }
      } catch (error: any) {
        this.logger.warn(
          `Pexels API query failed: ${error.message}. falling back to curated assets...`,
        );
      }
    }

    // 3. Fallback to curated high-fidelity stock database based on simple semantic matching
    return this.getCuratedFallback(cleanedQuery);
  }

  private getCuratedFallback(query: string): string {
    const normalized = query.toLowerCase();

    if (normalized.includes('manali')) {
      return 'https://images.unsplash.com/photo-1605649487212-4f7ccdb04934?q=80&w=1080';
    }
    if (normalized.includes('hadimba')) {
      return 'https://images.unsplash.com/photo-1626296715093-6110f01a3556?q=80&w=1080';
    }
    if (normalized.includes('solang')) {
      return 'https://images.unsplash.com/photo-1593118925567-33a817454807?q=80&w=1080';
    }
    if (normalized.includes('rohtang')) {
      return 'https://images.unsplash.com/photo-1610023602165-2fb430155a02?q=80&w=1080';
    }
    if (
      normalized.includes('cafe') ||
      normalized.includes('crawl') ||
      normalized.includes('crawl')
    ) {
      return 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?q=80&w=1080';
    }
    if (
      normalized.includes('trek') ||
      normalized.includes('mountain') ||
      normalized.includes('climb')
    ) {
      return 'https://images.unsplash.com/photo-1501555088652-021faa106b9b?q=80&w=1080';
    }
    if (normalized.includes('waterfall') || normalized.includes('river')) {
      return 'https://images.unsplash.com/photo-1482862549707-f63cb32c5fd9?q=80&w=1080';
    }
    if (normalized.includes('camp') || normalized.includes('igloo')) {
      return 'https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?q=80&w=1080';
    }
    if (
      normalized.includes('car') ||
      normalized.includes('suv') ||
      normalized.includes('drive')
    ) {
      return 'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?q=80&w=1080';
    }

    // Default premium travel photo
    return 'https://images.unsplash.com/photo-1488646953014-85cb44e25828?q=80&w=1080';
  }
}
