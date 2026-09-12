import { Inject, UseGuards } from '@nestjs/common';
import { Args, CONTEXT, Query, Mutation, Resolver } from '@nestjs/graphql';
import { CommonCouponService } from '@ridy/database';

import { UserContext } from '../auth/authenticated-user';
import { GqlAuthGuard } from '../auth/access-token.guard';
import { CommonGiftCardService } from '@ridy/database';
import { CouponDTO } from './dto/coupon.dto';
import { GiftCardDTO } from '../wallet/dto/gift-card.dto';

@Resolver()
@UseGuards(GqlAuthGuard)
export class CouponResolver {
  constructor(
    private commonCouponService: CommonCouponService,
    private commonGiftCardService: CommonGiftCardService,
    @Inject(CONTEXT)
    private context: UserContext,
  ) {}

  @Query(() => CouponDTO, { nullable: true })
  async couponInfo(
    @Args('code', { type: () => String }) code: string,
  ): Promise<CouponDTO | undefined> {
    return this.commonCouponService.getCouponInfo({
      code,
      riderId: this.context.req.user.id,
    });
  }

  @Mutation(() => GiftCardDTO)
  async redeemGiftCard(
    @Args('code', { type: () => String }) code: string,
  ): Promise<GiftCardDTO> {
    const result = await this.commonGiftCardService.redeemGiftCard({
      code,
      userType: 'rider',
      userId: this.context.req.user.id,
    });
    return result;
  }
}
