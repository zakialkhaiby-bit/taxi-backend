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
import { RideOfferRedisService, RideOfferDTO } from '@ridy/database';
import { DriverRedisService } from '@ridy/database';
import { UserContext } from '../auth/authenticated-user';
import { GqlAuthGuard } from '../auth/jwt-gql-auth.guard';
import { OrderService } from './order.service';
import { RiderReviewInput } from './dto/rider-review.input';
import { UpdateStatusDTO } from './dto/update-status.dto';
import { ActiveOrderDTO } from './dto/active-order.dto';
import { PastOrderDTO } from './dto/past-order.dto';
import { OrderCancelReasonDTO } from './dto/cancel-reason.dto';

@Resolver()
@UseGuards(GqlAuthGuard)
export class OrderResolver {
  constructor(
    @Inject(CONTEXT) private context: UserContext,
    private orderService: OrderService,
    private driverRedisService: DriverRedisService,
    private orderRedisService: RideOfferRedisService,
  ) {}

  @Query(() => [ActiveOrderDTO])
  async activeOrders(): Promise<ActiveOrderDTO[]> {
    const orders = await this.orderService.getActiveOrders(
      this.context.req.user.id,
    );
    return orders;
  }

  @Query(() => [RideOfferDTO], {
    description: 'Get all ride offers for the driver',
  })
  async rideOffers(): Promise<RideOfferDTO[]> {
    const driverId = this.context.req.user.id;
    const driverMetadata =
      await this.driverRedisService.getOnlineDriverMetaData(
        driverId.toString(),
      );
    if (!driverMetadata?.rideOfferIds) {
      return [];
    }
    const rideOffers = await Promise.all(
      driverMetadata.rideOfferIds.map((offerId) =>
        this.orderRedisService.getRideOfferMetadataAsRideOffer(offerId),
      ),
    );
    return rideOffers;
  }

  @Mutation(() => ActiveOrderDTO)
  async acceptRideOffer(
    @Args('orderId', { type: () => ID }) orderId: number,
  ): Promise<ActiveOrderDTO> {
    const driverId = this.context.req.user.id;
    const order = await this.orderRedisService.getRideOfferMetadata(
      orderId.toString(),
    );
    if (!order) {
      throw new Error(`Order with ID ${orderId} not found`);
    }
    if (!order.offeredToDriverIds.includes(driverId.toString())) {
      throw new Error(
        `Driver with ID ${driverId} is not assigned to order ${orderId}`,
      );
    }
    return this.orderService.acceptRideOffer({ orderId, driverId });
  }

  @Mutation(() => Boolean)
  async rejectRideOffer(
    @Args('orderId', { type: () => ID }) orderId: number,
  ): Promise<boolean> {
    const driverId = this.context.req.user.id;
    return this.orderService.rejectRideOffer({ orderId, driverId });
  }

  @Mutation(() => Boolean)
  async submitReview(
    @Args('input', { type: () => RiderReviewInput }) input: RiderReviewInput,
  ): Promise<boolean> {
    await this.orderService.submitReview({
      ...input,
      driverId: this.context.req.user.id,
    });
    return true;
  }

  @Mutation(() => UpdateStatusDTO)
  async arrivedToPickup(
    @Args('orderId', { type: () => ID }) orderId: number,
  ): Promise<UpdateStatusDTO> {
    const result = await this.orderService.arrivedToPickup({
      orderId,
      driverId: this.context.req.user.id,
    });
    return result;
  }

  @Mutation(() => UpdateStatusDTO)
  async arrivedToDestination(
    @Args('orderId', { type: () => ID }) orderId: number,
  ): Promise<UpdateStatusDTO> {
    const result = await this.orderService.arrivedToDestination({
      orderId,
      driverId: this.context.req.user.id,
    });
    return result;
  }

  @Mutation(() => UpdateStatusDTO)
  async initiateRide(
    @Args('orderId', { type: () => ID }) orderId: number,
  ): Promise<UpdateStatusDTO> {
    const result = await this.orderService.initiateRide({
      orderId,
      driverId: this.context.req.user.id,
    });
    return result;
  }

  @Mutation(() => UpdateStatusDTO)
  async cancelRide(
    @Args('orderId', { type: () => ID }) orderId: number,
    @Args('reasonId', { type: () => ID }) reasonId: number,
    @Args('reasonNote', { type: () => String, nullable: true })
    reasonNote: string | null,
  ): Promise<UpdateStatusDTO> {
    const result = await this.orderService.cancelRide({
      orderId,
      driverId: this.context.req.user.id,
      reasonId,
      reasonNote,
    });
    return result;
  }

  @Query(() => [PastOrderDTO])
  async pastOrders(
    @Args('page', { type: () => Int, nullable: true }) page?: number,
    @Args('limit', { type: () => Int, nullable: true }) limit?: number,
  ): Promise<PastOrderDTO[]> {
    const orders = await this.orderService.getPastOrders(
      this.context.req.user.id,
      page,
      limit,
    );
    return orders;
  }

  @Query(() => [OrderCancelReasonDTO])
  async cancelReasons(): Promise<OrderCancelReasonDTO[]> {
    return this.orderService.getCancelReasons();
  }

  @Mutation(() => UpdateStatusDTO)
  async riderPaidInCash(
    @Args('orderId', { type: () => ID }) orderId: number,
  ): Promise<UpdateStatusDTO> {
    const driverId = this.context.req.user.id;
    return this.orderService.riderPaidInCash({ orderId, driverId });
  }
}
