export interface LocationDetails {
  formattedAddress: string;
  latitude: number;
  longitude: number;
  placeId?: string;
  rating?: number;
}

export abstract class BaseMapsProvider {
  abstract searchLocation(query: string): Promise<LocationDetails>;
}
