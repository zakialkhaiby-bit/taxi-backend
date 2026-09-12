import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { GeoResolver } from './geo.resolver';
import { GoogleGeoService } from './google-geo.service';
import { NominitamGeoService } from './nominitam-geo.service';
import { MapboxGeoService } from './mapbox-geo.service';
import { SharedConfigurationService } from '../config/shared-configuration.service';

@Module({
  imports: [HttpModule],
  providers: [
    GeoResolver,
    GoogleGeoService,
    NominitamGeoService,
    MapboxGeoService,
    SharedConfigurationService,
  ],
  exports: [MapboxGeoService],
})
export class GeoModule {}
