import { Injectable } from '@nestjs/common';
import { PlaceDTO } from '../interfaces/place.dto';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

export const MAPBOX_DEFAULT_TOKEN = process.env.MAPBOX_TOKEN || '';

@Injectable()
export class MapboxGeoService {
  constructor(private httpService: HttpService) {}

  async getPlaces(input: {
    keyword: string;
    location?: {
      lat: number;
      lng: number;
    };
    radius?: number;
    language?: string;
    apiKey?: string;
  }): Promise<PlaceDTO[]> {
    const token =
      input.apiKey ||
      process.env.MAPBOX_TOKEN ||
      MAPBOX_DEFAULT_TOKEN;

    const params: Record<string, string> = {
      access_token: token,
      autocomplete: 'true',
    };

    if (input.language) {
      params['language'] = input.language;
    } else {
      params['language'] = 'ar,en';
    }

    if (input.location) {
      params['proximity'] = `${input.location.lng},${input.location.lat}`;
    }

    try {
      const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(
        input.keyword,
      )}.json`;
      const result = await firstValueFrom(
        this.httpService.get(url, { params }),
      );

      const features: MapboxFeature[] = result.data.features || [];
      return features.map((f) => ({
        point: {
          lat: f.center[1],
          lng: f.center[0],
        },
        title: f.text || f.place_name,
        address: f.place_name,
      }));
    } catch (e) {
      return [];
    }
  }

  async reverseGeocode(input: {
    lat: number;
    lng: number;
    language?: string;
    apiKey?: string;
  }): Promise<PlaceDTO> {
    const token =
      input.apiKey ||
      process.env.MAPBOX_TOKEN ||
      MAPBOX_DEFAULT_TOKEN;

    const params: Record<string, string> = {
      access_token: token,
    };

    if (input.language) {
      params['language'] = input.language;
    } else {
      params['language'] = 'ar,en';
    }

    try {
      const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${input.lng},${input.lat}.json`;
      const result = await firstValueFrom(
        this.httpService.get(url, { params }),
      );

      const features: MapboxFeature[] = result.data.features || [];
      if (features.length > 0) {
        const top = features[0];
        return {
          point: {
            lat: input.lat,
            lng: input.lng,
          },
          title: top.text || top.place_name,
          address: top.place_name,
        };
      }
    } catch (e) {}

    return {
      point: {
        lat: input.lat,
        lng: input.lng,
      },
      title: `${input.lat.toFixed(4)}, ${input.lng.toFixed(4)}`,
      address: `${input.lat.toFixed(4)}, ${input.lng.toFixed(4)}`,
    };
  }
}

interface MapboxFeature {
  id: string;
  text: string;
  place_name: string;
  center: [number, number]; // [lng, lat]
}
