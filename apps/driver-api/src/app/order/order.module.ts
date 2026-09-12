import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  OrderCancelReasonEntity,
  RequestActivityEntity,
  SharedOrderModule,
} from '@ridy/database';
import { DriverTransactionEntity } from '@ridy/database';
import { DriverWalletEntity } from '@ridy/database';
import { DriverEntity } from '@ridy/database';
import { TaxiOrderEntity } from '@ridy/database';
import { ProviderTransactionEntity } from '@ridy/database';
import { ProviderWalletEntity } from '@ridy/database';
import { CustomerEntity } from '@ridy/database';
import { RiderTransactionEntity } from '@ridy/database';
import { RiderWalletEntity } from '@ridy/database';
import { ServiceCategoryEntity } from '@ridy/database';
import { ServiceEntity } from '@ridy/database';
import { PaymentEntity } from '@ridy/database';
import { FirebaseNotificationModule } from '@ridy/database';
import { GoogleServicesModule } from '@ridy/database';
import { RegionModule } from '@ridy/database';

import { OrderResolver } from './order.resolver';
import { RedisHelpersModule } from '@ridy/database';
import { DriverModule } from '../driver/driver.module';
import { OrderService } from './order.service';
import { FleetWalletEntity } from '@ridy/database';
import { FleetTransactionEntity } from '@ridy/database';
import { OrderSubscriptionService } from './order-subscription.service';
import { FleetEntity } from '@ridy/database';
import { ServiceOptionEntity } from '@ridy/database';
import { CommonCouponModule } from '@ridy/database';
import { ZonePriceEntity } from '@ridy/database';
import { HttpModule } from '@nestjs/axios';
import { RiderReviewEntity } from '@ridy/database';
import { SharedCustomerWalletModule } from '@ridy/database';

@Module({
  imports: [
    RedisHelpersModule,
    DriverModule,
    SharedOrderModule,
    CommonCouponModule,
    SharedCustomerWalletModule,
    TypeOrmModule.forFeature([
      TaxiOrderEntity,
      ServiceCategoryEntity,
      ServiceOptionEntity,
      ServiceEntity,
      CustomerEntity,
      RiderWalletEntity,
      RiderTransactionEntity,
      DriverEntity,
      DriverWalletEntity,
      DriverTransactionEntity,
      ProviderWalletEntity,
      ProviderTransactionEntity,
      FleetEntity,
      FleetWalletEntity,
      FleetTransactionEntity,
      ZonePriceEntity,
      PaymentEntity,
      RiderReviewEntity,
      RequestActivityEntity,
      OrderCancelReasonEntity,
    ]),
    RegionModule,
    HttpModule,
    FirebaseNotificationModule.register(),
    GoogleServicesModule,
  ],
  providers: [OrderSubscriptionService, OrderResolver, OrderService],
  exports: [],
})
export class OrderModule {}
