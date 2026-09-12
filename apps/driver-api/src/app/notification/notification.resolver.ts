import { Inject, UseGuards } from '@nestjs/common';
import { Args, CONTEXT, Mutation, Resolver } from '@nestjs/graphql';
import { NotificationService } from './notification.service';
import { UserContext } from '../auth/authenticated-user';
import { GqlAuthGuard } from '../auth/jwt-gql-auth.guard';

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
