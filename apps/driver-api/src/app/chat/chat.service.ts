import {
  ActiveOrderCommonRedisService,
  ActiveOrderRiderRedisService,
  ChatMessageDTO,
  ChatMessageRedisSnapshot,
  DriverRedisService,
  PubSubService,
  RiderOrderUpdateType,
} from '@ridy/database';
import { RiderNotificationService } from '@ridy/database';

import { OrderMessageInput } from './dto/order-message.input';
import { Injectable } from '@nestjs/common';

@Injectable()
export class ChatService {
  constructor(
    private readonly activeOrderRedisService: ActiveOrderCommonRedisService,
    private readonly activeOrderRiderRedisService: ActiveOrderRiderRedisService,
    private readonly driverRedisService: DriverRedisService,
    private readonly pubsub: PubSubService,
    private riderNotificationService: RiderNotificationService,
  ) {}

  async sendMessage(input: OrderMessageInput): Promise<ChatMessageDTO> {
    const order = await this.activeOrderRedisService.getActiveOrder(
      input.requestId.toString(),
    );
    const driver = await this.driverRedisService.getOnlineDriverMetaData(
      order.driverId,
    );
    const fcmToken = driver?.fcmTokens?.[0];
    if (fcmToken != null) {
      this.riderNotificationService.message(fcmToken, input.content);
    }
    await this.activeOrderRedisService.addMessageToOrder({
      orderId: order.id,
      message: input.content,
      user: 'driver',
    });
    this.pubsub.publish(
      'rider.order.updated',
      {
        riderId: parseInt(order.riderId),
      },
      {
        type: RiderOrderUpdateType.NewMessageReceived,
        message: {
          message: input.content,
          isFromMe: false,
          createdAt: new Date(),
        },
        unreadMessagesCount: order.chatMessages.filter(
          (msg: ChatMessageRedisSnapshot) =>
            !msg.isFromDriver && msg.seenByDriverAt == null,
        ).length,
        orderId: order!.id,
        riderId: order!.riderId!,
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
