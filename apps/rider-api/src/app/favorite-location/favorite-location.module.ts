import { Module } from '@nestjs/common';
import { FavoriteLocationResolver } from './favorite-location.resolver';
import { FavoriteLocationService } from './favorite-location.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RiderAddressEntity } from '@ridy/database';

@Module({
  imports: [TypeOrmModule.forFeature([RiderAddressEntity])],
  providers: [FavoriteLocationResolver, FavoriteLocationService],
})
export class FavoriteLocationModule {}
