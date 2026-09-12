import { Inject, Injectable } from '@nestjs/common';
import { Subscription } from '@nestjs/graphql';
import { AdminNotificationUnion } from './dtos/admin-notification.dto';
import { PUBSUB, PubSubPort } from '@ridy/database';

@Injectable()
export class NotificationSubscriptionService {
  constructor(
    @Inject(PUBSUB)
    private readonly pubSub: PubSubPort,
  ) {}

  @Subscription(() => AdminNotificationUnion)
  async notificationCreated() {
    return this.pubSub.asyncIterator('adminNotificationCreated');
  }
}
