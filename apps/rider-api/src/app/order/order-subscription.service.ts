import { Injectable } from '@nestjs/common';
import { Context, Subscription } from '@nestjs/graphql';
import { PubSubService, RiderActiveOrderUpdateDTO } from '@ridy/database';
import { plainToInstance } from 'class-transformer';

@Injectable()
export class OrderSubscriptionService {
  constructor(private readonly pubsub: PubSubService) {}

  @Subscription(() => RiderActiveOrderUpdateDTO, {
    filter: (payload: RiderActiveOrderUpdateDTO, variables, context) =>
      context.req.extra.user.id == payload.riderId,
    resolve: (payload: RiderActiveOrderUpdateDTO) => {
      if (payload.message) {
        payload.message.createdAt =
          payload.message.createdAt != null
            ? new Date(payload.message.createdAt)
            : new Date();
      }
      if (payload.pickupEta) {
        payload.pickupEta = new Date(payload.pickupEta);
      }
      return plainToInstance(RiderActiveOrderUpdateDTO, payload);
    },
  })
  activeOrderUpdated(@Context() ctx: any) {
    return this.pubsub.asyncIterator('rider.order.updated', {
      riderId: ctx.req.extra.user.id,
    });
  }
}
