export interface WeatherDetails {
  temperatureC: number;
  condition: string;
  humidity: number;
  windSpeedKph: number;
}

export abstract class BaseWeatherProvider {
  abstract getWeather(latitude: number, longitude: number): Promise<WeatherDetails>;
}
