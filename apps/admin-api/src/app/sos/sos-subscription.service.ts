import { Inject, Injectable, Logger } from '@nestjs/common';
import { Subscription } from '@nestjs/graphql';
import { WSContext } from '../auth/authenticated-admin';
import { SOSDTO } from './dto/sos.dto';
import { PUBSUB, PubSubPort } from '@ridy/database';

@Injectable()
export class SOSSubscriptionService {
  constructor(
    @Inject(PUBSUB)
    public pubSub: PubSubPort,
  ) {}

  @Subscription(() => SOSDTO, {
    filter: (
      payload: { sosCreated: SOSDTO; adminIds: number[] },
      variables,
      context: WSContext,
    ) => {
      Logger.log(payload.adminIds.includes(context.req.user.id));
      return payload.adminIds.includes(context.req.user.id);
    },
  })
  sosCreated() {
    return this.pubSub.asyncIterator('sosCreated');
  }
}
