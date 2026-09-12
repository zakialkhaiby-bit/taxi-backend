import { DynamicModule, Module, OnModuleInit } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { GraphQLModule } from '@nestjs/graphql';
import { ScheduleModule } from '@nestjs/schedule';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  CryptoService,
  DatabaseModule,
  entities,
  StorageModule,
} from '@ridy/database';

import { join } from 'path';
import { SentryGlobalFilter, SentryModule } from '@sentry/nestjs/setup';

import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { SharedDriverService } from '@ridy/database';

import { AnnouncementsModule } from './announcemnts/announcements.module';
import { AuthModule } from './auth/auth.module';
import { validateToken } from './auth/jwt.strategy';
import { ChatModule } from './chat/chat.module';
import { ComplaintModule } from './complaint/complaint.module';
import { DriverApiSetupNotFoundController } from './driver-api-setup-not-found.controller';
import { DriverAPIController } from './driver-api.controller';
import { DriverModule } from './driver/driver.module';
import { FeedbacksModule } from './feedbacks/feedbacks.module';
import { OrderModule } from './order/order.module';
import { PayoutModule } from './payout/payout.module';
import { SOSModule } from './sos/sos.module';
import { UploadModule } from './upload/upload.module';
import { WalletModule } from './wallet/wallet.module';
import { APP_FILTER } from '@nestjs/core';
import { PrometheusModule } from '@willsoto/nestjs-prometheus';
import {
  getConfig,
  LicenseVerifyModule,
  LicenseVerifyService,
} from 'license-verify';
import { Context } from 'graphql-ws';
import { NotificationModule } from './notification/notification.module';
import { EphemeralMessagesModule } from './ephemeral-messages/ephemeral-messages.module';

@Module({})
export class DriverAPIModule implements OnModuleInit {
  constructor(private licenseService: LicenseVerifyService) {}

  async onModuleInit() {
    this.licenseService.verifyLicense();
  }

  static async register(): Promise<DynamicModule> {
    const config = await getConfig(process.env.NODE_ENV ?? 'production');
    if (config) {
      return {
        module: DriverAPIModule,
        imports: [
          DatabaseModule,
          LicenseVerifyModule,
          StorageModule,
          EphemeralMessagesModule,
          PrometheusModule.register(),
          FeedbacksModule,
          PayoutModule,
          SOSModule,
          SentryModule.forRoot(),
          ConfigModule.forRoot({
            cache: true,
            isGlobal: true,
          }),
          ScheduleModule.forRoot(),
          GraphQLModule.forRoot<ApolloDriverConfig>({
            driver: ApolloDriver,
            // cors: false,
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
            autoSchemaFile: join(
              process.cwd(),
              'apps/taxi-driver-frontend/lib/core/graphql/schema.gql',
              // 'apps/driver-frontend/lib/core/graphql/schema.gql',
            ),
          }),
          TypeOrmModule.forFeature(entities),
          AuthModule.register(),
          UploadModule,
          DriverModule,
          ChatModule,
          OrderModule,
          WalletModule,
          NotificationModule,
          AnnouncementsModule,
          ComplaintModule,
        ],
        controllers: [DriverAPIController],
        providers: [
          CryptoService,
          SharedDriverService,
          {
            provide: APP_FILTER,
            useClass: SentryGlobalFilter,
          },
        ],
      };
    }

    return {
      module: DriverAPIModule,
      imports: [LicenseVerifyModule],
      controllers: [DriverApiSetupNotFoundController],
    };
  }
}
