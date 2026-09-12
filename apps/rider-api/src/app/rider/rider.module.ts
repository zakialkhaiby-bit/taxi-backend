import { Module } from '@nestjs/common';
import {
  CustomerEntity,
  RedisHelpersModule,
  TaxiOrderEntity,
} from '@ridy/database';
import { RiderWalletEntity } from '@ridy/database';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SharedRiderService } from '@ridy/database';
import { RiderTransactionEntity } from '@ridy/database';
import { DriverEntity } from '@ridy/database';
import { RiderResolver } from './rider.resolver';
import { RiderService } from './rider.service';

@Module({
  imports: [
    RedisHelpersModule,
    TypeOrmModule.forFeature([
      CustomerEntity,
      DriverEntity,
      RiderWalletEntity,
      RiderTransactionEntity,
      TaxiOrderEntity,
    ]),
  ],
  providers: [SharedRiderService, RiderResolver, RiderService],
  exports: [SharedRiderService, RiderService],
})
export class RiderModule {}
