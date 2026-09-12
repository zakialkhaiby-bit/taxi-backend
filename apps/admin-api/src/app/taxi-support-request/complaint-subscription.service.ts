import { Inject, Injectable } from '@nestjs/common';
import { Subscription } from '@nestjs/graphql';
import { WSContext } from '../auth/authenticated-admin';
import { TaxiSupportRequestDTO } from './dto/taxi-support-request.dto';
import { PUBSUB, PubSubPort } from '@ridy/database';

@Injectable()
export class ComplaintSubscriptionService {
  constructor(
    @Inject(PUBSUB)
    public pubSub: PubSubPort,
  ) {}

  @Subscription(() => TaxiSupportRequestDTO, {
    filter: (
      payload: { complaintCreated: TaxiSupportRequestDTO; adminIds: number[] },
      variables,
      context: WSContext,
    ) => {
      return payload.adminIds.includes(context.req.user.id);
    },
  })
  complaintCreated() {
    return this.pubSub.asyncIterator('complaintCreated');
  }
}
