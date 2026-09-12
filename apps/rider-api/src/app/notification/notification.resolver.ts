import { Inject, UseGuards } from '@nestjs/common';
import { Args, CONTEXT, Mutation, Resolver } from '@nestjs/graphql';
import { GqlAuthGuard } from '../auth/access-token.guard';
import { NotificationService } from './notification.service';
import { UserContext } from '../auth/authenticated-user';

@Resolver()
@UseGuards(GqlAuthGuard)
export class NotificationResolver {
  constructor(
    @Inject(CONTEXT) private context: UserContext,
    private readonly notificationService: NotificationService,
  ) {}

  @Mutation(() => Boolean)
  async updateFcmToken(@Args('fcmToken') fcmToken: string): Promise<boolean> {
    await this.notificationService.updateFcmToken({
      customerId: this.context.req.user!.id,
      fcmToken,
    });
    return true;
  }
}
