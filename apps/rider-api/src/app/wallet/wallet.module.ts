import { Module } from '@nestjs/common';
import { WalletResolver } from './wallet-resolver';
import {
  CryptoService,
  CustomerEntity,
  PaymentGatewayEntity,
  RedisHelpersModule,
  RiderTransactionEntity,
  RiderWalletEntity,
  SavedPaymentMethodEntity,
} from '@ridy/database';
import { HttpModule } from '@nestjs/axios';
import { WalletService } from './wallet.service';
import { CommonCouponModule } from '@ridy/database';
import { TypeOrmModule } from '@nestjs/typeorm';

@Module({
  imports: [
    RedisHelpersModule,
    TypeOrmModule.forFeature([
      CustomerEntity,
      RiderWalletEntity,
      RiderTransactionEntity,
      PaymentGatewayEntity,
      SavedPaymentMethodEntity,
    ]),
    HttpModule,
    CommonCouponModule,
  ],
  providers: [WalletResolver, WalletService, CryptoService],
  exports: [WalletService],
})
export class WalletModule {}
