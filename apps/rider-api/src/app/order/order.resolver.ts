import { Inject, UseGuards } from '@nestjs/common';
import {
  Args,
  CONTEXT,
  ID,
  Int,
  Mutation,
  Query,
  Resolver,
} from '@nestjs/graphql';
import {
  CommonCouponService,
  PaymentMethodInput,
  PlaceDTO,
} from '@ridy/database';
import { Point } from '@ridy/database';
import { SharedOrderService } from '@ridy/database';
import { DriverRedisService } from '@ridy/database';
import { UserContextOptional } from '../auth/authenticated-user';
import { GqlAuthGuard } from '../auth/access-token.guard';
import { CalculateFareDTO } from './dto/calculate-fare.dto';
import { CalculateFareInput } from './dto/calculate-fare.input';
import { CreateOrderInput } from './dto/create-order.input';
import { SubmitFeedbackInput } from './dto/submit-feedback.input';
import { RiderOrderService } from './order.service';
import { ActiveOrderDTO } from './dto/active-order.dto';
import { ApplyCouponResponseDTO } from './dto/apply-coupon.dto';
import { UpdateOrderWaitTimeResponseDTO } from './dto/update-order-wait-time-response.dto';
import { PastOrderDTO } from './dto/past-order.dto';
import { OrderCancelReasonDTO } from './dto/cancel-reason.dto';
import { TopUpWalletResponse } from '../wallet/dto/top-up-wallet.input';

@Resolver()
export class OrderResolver {
  constructor(
    @Inject(CONTEXT) private context: UserContextOptional,
    private orderService: SharedOrderService,
    private riderOrderService: RiderOrderService,
    private driverRedisService: DriverRedisService,
    private commonCouponService: CommonCouponService,
  ) {}

  @Query(() => [ActiveOrderDTO])
  @UseGuards(GqlAuthGuard)
  async activeOrders(): Promise<ActiveOrderDTO[]> {
    return this.riderOrderService.getActiveOrders(this.context.req.user!.id);
  }

  @Query(() => CalculateFareDTO)
  async getFares(
    @Args('input', { type: () => CalculateFareInput })
    input: CalculateFareInput,
  ): Promise<CalculateFareDTO> {
    let coupon;
    if (
      input.couponCode != null &&
      this.context.req.user?.id != null &&
      input.couponCode.length > 0
    ) {
      coupon = await this.commonCouponService.checkCoupon(input.couponCode);
    }
    return this.orderService.calculateFare({
      points: input.points,
      coupon: coupon,
      riderId: this.context.req.user!.id,
      twoWay: input.twoWay,
      waitTime: input.waitTime,
      selectedOptionIds: input.selectedOptionIds,
      orderType: input.orderType,
    });
  }

  @Mutation(() => [ActiveOrderDTO])
  @UseGuards(GqlAuthGuard)
  async createOrder(
    @Args('input', { type: () => CreateOrderInput }) input: CreateOrderInput,
  ): Promise<ActiveOrderDTO[]> {
    await this.orderService.createOrder({
      ...input,
      type: input.orderType,
      riderId: this.context.req.user!.id,
      optionIds: input.optionIds,
      waitMinutes: input.waitTime ?? 0,
      twoWay: input.twoWay,
      paymentMode: input.paymentMode,
      paymentMethodId: input.paymentMethodId,
    });
    const activeOrders = await this.riderOrderService.getActiveOrders(
      this.context.req.user!.id,
    );
    return activeOrders;
  }

  @Mutation(() => Boolean)
  @UseGuards(GqlAuthGuard)
  async cancelOrder(
    @Args('orderId', { type: () => ID, nullable: false }) orderId: number,
    @Args('cancelReasonId', { type: () => ID, nullable: true })
    cancelReasonId?: number,
    @Args('cancelReasonNote', { type: () => String, nullable: true })
    cancelReasonNote?: string,
  ): Promise<boolean> {
    await this.riderOrderService.cancelOrder({
      orderId: orderId,
      reasonId: cancelReasonId,
      reason: cancelReasonNote,
    });
    return true;
  }

  @Mutation(() => Boolean)
  @UseGuards(GqlAuthGuard)
  async cancelBooking(
    @Args('id', { type: () => ID }) id: number,
    @Args('cancelReasonId', { type: () => ID!, nullable: true })
    cancelReasonId?: number,
    @Args('cancelReasonNote', { type: () => String, nullable: true })
    cancelReasonNote?: string,
  ): Promise<boolean> {
    this.riderOrderService.cancelOrder({
      orderId: id,
      reasonId: cancelReasonId,
      reason: cancelReasonNote,
    });
    return true;
  }

  @Query(() => [Point])
  async driversAround(
    @Args('center', { type: () => Point, nullable: true }) center?: Point,
  ): Promise<Point[]> {
    if (center == null) return [];
    const closeDrivers = await this.driverRedisService.getCloseDrivers({
      point: center,
      maxCount: 5,
      maxDistance: 10000, // 10 km
    });
    return closeDrivers;
  }

  @Query(() => [Point], {
    deprecationReason: 'Use driversAround instead',
  })
  async getDriversLocation(
    @Args('center', { type: () => Point, nullable: true }) center?: Point,
  ): Promise<Point[]> {
    if (center == null) return [];
    const closeDrivers = await this.driverRedisService.getCloseDrivers({
      point: center,
      maxCount: 5,
      maxDistance: 10000, // 10 km
    });
    return closeDrivers;
  }

  @Mutation(() => Boolean)
  @UseGuards(GqlAuthGuard)
  async submitReview(
    @Args('review', { type: () => SubmitFeedbackInput })
    review: SubmitFeedbackInput,
  ): Promise<boolean> {
    await this.riderOrderService.submitReview(
      this.context.req.user!.id,
      review,
    );
    return true;
  }

  @Mutation(() => Boolean, {
    deprecationReason:
      'Not used anymore. epheremal messages expire on their own.',
  })
  @UseGuards(GqlAuthGuard)
  async skipReview(): Promise<boolean> {
    return true;
  }

  @Mutation(() => UpdateOrderWaitTimeResponseDTO)
  @UseGuards(GqlAuthGuard)
  async updateOrderWaitTime(
    @Args('orderId', { type: () => ID }) orderId: number,
    @Args('waitTime', {
      type: () => Int,
      description: 'New wait time in minutes',
    })
    waitTime: number,
  ): Promise<UpdateOrderWaitTimeResponseDTO> {
    const response = await this.riderOrderService.updateOrderWaitTime(
      orderId,
      waitTime,
    );
    return {
      waitTime: response.waitMinutes ?? 0,
      totalCost: response.costEstimateForRider ?? 0,
    };
  }

  @Mutation(() => ApplyCouponResponseDTO)
  @UseGuards(GqlAuthGuard)
  async applyCoupon(
    @Args('orderId', { type: () => ID }) orderId: number,
    @Args('couponCode', { type: () => String }) couponCode: string,
  ): Promise<ApplyCouponResponseDTO> {
    const { costEstimateForRider, couponDiscount } =
      await this.riderOrderService.applyCoupon(orderId, couponCode);
    return {
      totalCost: costEstimateForRider - (couponDiscount ?? 0),
      couponDiscount: couponDiscount,
    };
  }

  @Query(() => [PastOrderDTO])
  @UseGuards(GqlAuthGuard)
  async pastOrders() {
    return this.riderOrderService.getPastOrders(this.context.req.user!.id);
  }

  @Query(() => [OrderCancelReasonDTO])
  async cancelReasons(): Promise<OrderCancelReasonDTO[]> {
    return this.riderOrderService.getCancelReasons();
  }

  @Mutation(() => TopUpWalletResponse)
  async payForRide(
    @Args('orderId', { type: () => ID }) orderId: number,
    @Args('paymentMethod', { type: () => PaymentMethodInput })
    paymentMethod: PaymentMethodInput,
  ): Promise<TopUpWalletResponse> {
    return this.riderOrderService.payForRide({
      orderId,
      paymentMethod,
    });
  }

  @Query(() => [PlaceDTO])
  @UseGuards(GqlAuthGuard)
  async recentDestinations(): Promise<PlaceDTO[]> {
    return this.riderOrderService.getRecentPlaces(this.context.req.user!.id);
  }
}
