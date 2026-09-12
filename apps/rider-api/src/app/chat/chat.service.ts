import {
  ActiveOrderCommonRedisService,
  ActiveOrderRiderRedisService,
  ChatMessageDTO,
  ChatMessageRedisSnapshot,
  DriverEventType,
  DriverRedisService,
  PubSubService,
} from '@ridy/database';
import { DriverNotificationService } from '@ridy/database';

import { Injectable } from '@nestjs/common';

@Injectable()
export class ChatService {
  constructor(
    private readonly activeOrderRedisService: ActiveOrderCommonRedisService,
    private readonly activeOrderRiderRedisService: ActiveOrderRiderRedisService,
    private readonly driverRedisService: DriverRedisService,
    private readonly pubsub: PubSubService,
    private readonly driverNotificationService: DriverNotificationService,
  ) {}

  async sendMessage(input: {
    requestId: number;
    content: string;
  }): Promise<ChatMessageDTO> {
    const order = await this.activeOrderRedisService.getActiveOrder(
      input.requestId.toString(),
    );
    const driver = await this.driverRedisService.getOnlineDriverMetaData(
      order.driverId,
    );
    const fcmToken = driver?.fcmTokens?.[0];
    if (fcmToken != null) {
      this.driverNotificationService.message(fcmToken, input.content);
    }
    await this.activeOrderRedisService.addMessageToOrder({
      orderId: order.id,
      message: input.content,
      user: 'rider',
    });
    this.pubsub.publish(
      'driver.event',
      {
        driverId: parseInt(order!.driverId!),
      },
      {
        type: DriverEventType.MessageReceived,
        message: {
          message: input.content,
          isFromMe: false,
          createdAt: new Date(),
        },
        orderId: parseInt(order!.id),
        driverId: parseInt(order!.driverId!),
        unreadMessagesCount: order.chatMessages.filter(
          (msg: ChatMessageRedisSnapshot) =>
            !msg.isFromDriver && msg.seenByDriverAt == null,
        ).length,
      },
    );
    return {
      message: input.content,
      createdAt: new Date(),
      isFromMe: true,
    };
  }

  async updateLastSeenMessagesAt(orderId: number): Promise<boolean> {
    this.activeOrderRiderRedisService.updateLastSeenForRider(
      orderId,
      new Date(),
    );
    return true;
  }
}
