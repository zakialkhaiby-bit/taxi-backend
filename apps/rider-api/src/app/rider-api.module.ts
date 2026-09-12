import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { DynamicModule, Logger, Module, OnModuleInit } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { GraphQLModule } from '@nestjs/graphql';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  CryptoService,
  DatabaseModule,
  GeoModule,
  SharedOrderModule,
  SharedCustomerWalletModule,
  RedisHelpersModule,
  CustomerEntity,
  PaymentEntity,
  MediaEntity,
  PubSubModule,
  StorageModule,
} from '@ridy/database';
import { join } from 'path';
import { AnnouncementModule } from './announcement/announcement.module';
import { AuthModule } from './auth/auth.module';
import { validateToken } from './auth/jwt.strategy';
import { ChatModule } from './chat/chat.module';
import { ComplaintModule } from './complaint/complaint.module';
import { CouponModule } from './coupon/coupon.module';
import { DriverTendencyModule } from './driver_tendency/driver_tendency.module';
import { OrderModule } from './order/order.module';
import { RiderApiSetupNotFoundController } from './rider-api-setup-not-found.controller';
import { RiderAPIController } from './rider-api.controller';
import { RiderModule } from './rider/rider.module';
import { ServiceModule } from './service/service.module';
import { SOSModule } from './sos/sos.module';
import { UploadModule } from './upload/upload.module';
import { WalletModule } from './wallet/wallet.module';
import { SentryGlobalFilter, SentryModule } from '@sentry/nestjs/setup';
import { APP_FILTER } from '@nestjs/core';
import { Context } from 'graphql-ws';
import { PrometheusModule } from '@willsoto/nestjs-prometheus';
import { BullModule } from '@nestjs/bullmq';
import {
  getConfig,
  LicenseVerifyModule,
  LicenseVerifyService,
} from 'license-verify';
import { ExpressAdapter } from '@bull-board/express';
import { BullBoardModule } from '@bull-board/nestjs';
import { NotificationModule } from './notification/notification.module';
import { DispatchModule } from './dispatcher';
import { EphemeralMessagesModule } from './ephemeral-messages/ephemeral-messages.module';
import { FeedbackModule } from './feedback/feedback.module';
import { FavoriteLocationModule } from './favorite-location/favorite-location.module';

@Module({})
export class RiderAPIModule implements OnModuleInit {
  constructor(private licenseService: LicenseVerifyService) {}

  async onModuleInit() {
    const license = await this.licenseService.verifyLicense();
    Logger.log(license, 'RiderAPIModule.onModuleInit.license');
    console.log(`redis port: ${process.env.REDIS_PORT}`);
  }

  static async register(): Promise<DynamicModule> {
    const config = await getConfig(process.env.NODE_ENV ?? 'production');
    console.log(config, 'RiderAPIModule.register.config');
    if (config) {
      return {
        module: RiderAPIModule,
        imports: [
          DatabaseModule,
          LicenseVerifyModule,
          StorageModule,
          PrometheusModule.register(),
          SharedCustomerWalletModule,
          EphemeralMessagesModule,
          NotificationModule,
          DispatchModule,
          SentryModule.forRoot(),
          BullModule.forRoot({
            connection: {
              host: process.env.REDIS_HOST || 'localhost',
              port: parseInt(process.env.REDIS_PORT || '6379'),
              password: process.env.REDIS_PASSWORD || undefined,
            },
          }),
          BullBoardModule.forRoot({
            route: '/queues',
            adapter: ExpressAdapter,
          }),
          GraphQLModule.forRoot<ApolloDriverConfig>({
            driver: ApolloDriver,
            installSubscriptionHandlers: true,
            autoSchemaFile: join(
              process.cwd(),
              'apps/taxi-rider-frontend/lib/core/graphql/schema.gql',
              // 'apps/rider-frontend/lib/core/graphql/schema.gql',
            ),
            subscriptions: {
              'graphql-ws': {
                connectionInitWaitTimeout: 5000,
                onConnect: async (
                  ctx: Context<Record<string, unknown> | undefined, unknown>,
                ) => {
                  const token =
                    (ctx.connectionParams?.['authToken'] as string) ||
                    undefined;

                  if (!token) {
                    throw new Error('Missing auth token!');
                  }
                  const user = await validateToken(token!)!;
                  ctx.extra = {
                    user,
                  };
                  return { user };
                },
              },
            },
          }),
          // TypeOrmModule.forFeature(entities),
          TypeOrmModule.forFeature([
            CustomerEntity,
            PaymentEntity,
            MediaEntity,
          ]),
          AuthModule.register(),
          UploadModule,
          RiderModule,
          FeedbackModule,
          ServiceModule,
          OrderModule,
          DriverTendencyModule,
          FavoriteLocationModule,
          AnnouncementModule,
          GeoModule,
          SharedOrderModule,
          RedisHelpersModule,
          ComplaintModule,
          SOSModule,
          WalletModule,
          CouponModule,
          ConfigModule.forRoot({
            cache: false,
            isGlobal: true,
          }),
          PubSubModule,
          ChatModule,
        ],
        providers: [
          CryptoService,
          {
            provide: APP_FILTER,
            useClass: SentryGlobalFilter,
          },
        ],
        controllers: [RiderAPIController],
      };
    }
    return {
      module: RiderAPIModule,
      imports: [LicenseVerifyModule],
      controllers: [RiderApiSetupNotFoundController],
    };
  }
}
