import { Inject, Injectable } from '@nestjs/common';
import { Args, ID, Subscription } from '@nestjs/graphql';
import { PUBSUB, PubSubPort, TaxiOrderEntity } from '@ridy/database';
import { TaxiOrderDTO } from './dto/order.dto';

@Injectable()
export class OrderSubscriptionService {
  constructor(
    @Inject(PUBSUB)
    private readonly pubSub: PubSubPort,
  ) {}

  @Subscription(() => TaxiOrderDTO, {
    filter: (
      payload: { orderUpdated: TaxiOrderEntity },
      variables: { orderId: number },
      context,
    ) => {
      return variables.orderId == payload.orderUpdated.id;
    },
  })
  orderUpdated(@Args('orderId', { type: () => ID }) orderId: number) {
    return this.pubSub.asyncIterator('orderUpdated');
  }
}
