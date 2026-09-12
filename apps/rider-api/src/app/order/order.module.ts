import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  FirebaseNotificationModule,
  FleetEntity,
  OrderCancelReasonEntity,
  PubSubModule,
} from '@ridy/database';
import { DriverTransactionEntity } from '@ridy/database';
import { DriverWalletEntity } from '@ridy/database';
import { DriverEntity } from '@ridy/database';
import { TaxiOrderEntity } from '@ridy/database';
import { ProviderTransactionEntity } from '@ridy/database';
import { ProviderWalletEntity } from '@ridy/database';
import { GoogleServicesModule } from '@ridy/database';
import { RegionModule } from '@ridy/database';
import { RedisHelpersModule } from '@ridy/database';

import { RiderModule } from '../rider/rider.module';
import { ServiceModule } from '../service/service.module';
import { OrderResolver } from './order.resolver';
import { RiderOrderService } from './order.service';
import { FeedbackEntity } from '@ridy/database';
import { OrderSubscriptionService } from './order-subscription.service';
import { RequestActivityEntity } from '@ridy/database';
import { SharedOrderModule } from '@ridy/database';
import { RiderNotificationService } from '@ridy/database';
import { CouponModule } from '../coupon/coupon.module';
import { FeedbackParameterEntity } from '@ridy/database';
import { ServiceOptionEntity } from '@ridy/database';
import { CommonCouponModule } from '@ridy/database';
import { ZonePriceEntity } from '@ridy/database';
import { PaymentEntity } from '@ridy/database';
import { HttpModule } from '@nestjs/axios';
import { SharedCustomerWalletModule } from '@ridy/database';
import { DispatchModule } from '../dispatcher';
import { WalletModule } from '../wallet/wallet.module';

@Module({
  imports: [
    PubSubModule,
    DispatchModule,
    SharedCustomerWalletModule,
    TypeOrmModule.forFeature([
      OrderCancelReasonEntity,
      TaxiOrderEntity,
      ProviderWalletEntity,
      ProviderTransactionEntity,
      DriverEntity,
      DriverWalletEntity,
      DriverTransactionEntity,
      FeedbackEntity,
      RequestActivityEntity,
      FeedbackParameterEntity,
      ServiceOptionEntity,
      ZonePriceEntity,
      PaymentEntity,
      FleetEntity,
    ]),
    HttpModule,
    CommonCouponModule,
    GoogleServicesModule,
    FirebaseNotificationModule.register(),
    ServiceModule,
    RiderModule,
    RegionModule,
    forwardRef(() => CouponModule),
    RedisHelpersModule,
    SharedOrderModule,
    WalletModule,
  ],
  providers: [
    OrderSubscriptionService,
    OrderResolver,
    RiderOrderService,
    RiderNotificationService,
  ],
  exports: [],
})
export class OrderModule {}
