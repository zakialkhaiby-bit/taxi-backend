import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  AdminNotificationEntity,
  OperatorEntity,
  OperatorSessionEntity,
} from '@ridy/database';
import { NotificationSubscriptionService } from './notification-subscription.service';
import { NotificationResolver } from './notification.resolver';
import { NotiifcationService } from './notification.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      AdminNotificationEntity,
      OperatorEntity,
      OperatorSessionEntity,
    ]),
  ],
  providers: [
    NotiifcationService,
    NotificationResolver,
    NotificationSubscriptionService,
  ],
  exports: [NotiifcationService],
})
export class NotificationModule {}
