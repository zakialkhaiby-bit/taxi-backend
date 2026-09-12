import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CommonCouponModule } from '@ridy/database';

import { CouponEntity } from '@ridy/database';
import { PaymentEntity } from '@ridy/database';
import { TaxiOrderEntity } from '@ridy/database';
import { SharedOrderModule } from '@ridy/database';
import { OrderModule } from '../order/order.module';
import { CouponResolver } from './coupon.resolver';
import { CouponService } from './coupon.service';

@Module({
  imports: [
    forwardRef(() => OrderModule),
    SharedOrderModule,
    CommonCouponModule,
    TypeOrmModule.forFeature([TaxiOrderEntity, CouponEntity, PaymentEntity]),
  ],
  providers: [CouponService, CouponResolver],
  exports: [CouponService],
})
export class CouponModule {}
