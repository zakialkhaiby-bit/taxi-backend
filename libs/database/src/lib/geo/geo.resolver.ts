import { Args, Int, Query, Resolver } from '@nestjs/graphql';
import { PlaceDTO } from '@ridy/database';
import { GeoProvider } from './dto/geo-provider.enum';
import { GoogleGeoService } from './google-geo.service';
import { NominitamGeoService } from './nominitam-geo.service';
import { MapboxGeoService } from './mapbox-geo.service';
import { Point } from '../interfaces/point';
import { SharedConfigurationService } from '../config/shared-configuration.service';

@Resolver()
export class GeoResolver {
  constructor(
    private googleGeoService: GoogleGeoService,
    private nominitamGeoService: NominitamGeoService,
    private mapboxGeoService: MapboxGeoService,
    private configService: SharedConfigurationService,
  ) {}

  @Query(() => [PlaceDTO])
  async getPlaces(
    @Args('keyword') keyword: string,
    @Args('location', { nullable: true }) location?: Point,
    @Args('radius', {
      nullable: true,
      type: () => Int,
      description: 'Search radius from location argument in meters',
    })
    radius?: number,
    @Args('language', { nullable: true }) language?: string,
    @Args('provider', { nullable: true, type: () => GeoProvider })
    provider?: GeoProvider,
    @Args('apiKey', { nullable: true }) apiKey?: string,
  ): Promise<PlaceDTO[]> {
    const serverProvider = process.env.GEO_PROVIDER as EnvGeoProvider;
    if (serverProvider != null) {
      if (serverProvider === 'google') {
        provider = GeoProvider.GOOGLE;
      } else if (serverProvider === 'mapbox') {
        provider = GeoProvider.MAPBOX;
      } else if (serverProvider === 'nominitam') {
        provider = GeoProvider.NOMINATIM;
      }
    }
    if (provider === GeoProvider.MAPBOX) {
      return this.mapboxGeoService.getPlaces({
        keyword,
        location,
        radius,
        language,
        apiKey,
      });
    } else if (provider === GeoProvider.GOOGLE) {
      return this.googleGeoService.getPlaces({
        keyword,
        location,
        language,
      });
    } else {
      return this.nominitamGeoService.getPlaces({
        keyword,
        location,
        radius,
        language,
      });
    }
  }

  @Query(() => PlaceDTO)
  async reverseGeocode(
    @Args('location') location: Point,
    @Args('language', { nullable: true }) language?: string,
    @Args('provider', { nullable: true, type: () => GeoProvider })
    provider?: GeoProvider,
    @Args('apiKey', { nullable: true }) apiKey?: string,
  ): Promise<PlaceDTO> {
    const serverProvider = process.env.GEO_PROVIDER as EnvGeoProvider;
    if (serverProvider != null) {
      if (serverProvider === 'google') {
        provider = GeoProvider.GOOGLE;
      } else if (serverProvider === 'mapbox') {
        provider = GeoProvider.MAPBOX;
      } else if (serverProvider === 'nominitam') {
        provider = GeoProvider.NOMINATIM;
      }
    }
    if (provider === GeoProvider.MAPBOX) {
      return this.mapboxGeoService.reverseGeocode({
        lat: location.lat,
        lng: location.lng,
        language,
        apiKey,
      });
    } else if (provider === GeoProvider.GOOGLE) {
      return this.googleGeoService.reverseGeocode({
        lat: location.lat,
        lng: location.lng,
        language,
      });
    } else {
      return this.nominitamGeoService.reverseGeocode({
        lat: location.lat,
        lng: location.lng,
        language,
      });
    }
  }
}

type EnvGeoProvider = 'google' | 'nominitam' | 'mapbox';
