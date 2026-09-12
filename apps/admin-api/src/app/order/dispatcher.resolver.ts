import { Inject, UseGuards } from '@nestjs/common';
import { Resolver, Query, Args, Mutation, CONTEXT, ID } from '@nestjs/graphql';
import { SharedOrderService, TaxiOrderType } from '@ridy/database';
import type { UserContext } from '../auth/authenticated-admin';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CalculateFareDTO } from './dto/calculate-fare.dto';
import { CalculateFareInput } from './dto/calculate-fare.input';
import { CreateOrderInput } from './dto/create-order.input';
import { TaxiOrderDTO } from './dto/order.dto';
import { OrderService } from './order.service';
import { TaxiOrderDTOV2 } from './dto/taxi-order.dto';

@Resolver(() => TaxiOrderDTO)
export class DispatcherResolver {
  constructor(
    @Inject(CONTEXT) private context: UserContext,
    private sharedOrderService: SharedOrderService,
    private orderService: OrderService,
  ) {}

  @Query(() => CalculateFareDTO)
  async calculateFare(
    @Args('input', { type: () => CalculateFareInput })
    input: CalculateFareInput,
  ): Promise<CalculateFareDTO> {
    return this.sharedOrderService.calculateFare({ ...input, twoWay: false });
  }

  @Mutation(() => TaxiOrderDTO)
  @UseGuards(JwtAuthGuard)
  async createOrder(
    @Args('input', { type: () => CreateOrderInput }) input: CreateOrderInput,
  ): Promise<TaxiOrderDTO> {
    return this.sharedOrderService.createOrder({
      ...input,
      operatorId: this.context.req.user.id,
      twoWay: input.twoWay,
      optionIds: input.optionIds,
      waitMinutes: input.waitingTimeMinutes,
      driverId: input.driverId,
      type: TaxiOrderType.Ride,
      waypoints: input.points.map((p, index) => ({
        address: input.addresses[index],
        point: p,
      })),
    });
  }

  @Mutation(() => TaxiOrderDTO)
  async cancelOrder(
    @Args('orderId', { type: () => ID }) orderId: number,
  ): Promise<TaxiOrderDTO> {
    return this.orderService.cancelOrder(orderId);
  }

  @Mutation(() => TaxiOrderDTOV2)
  async assignDriverToOrder(
    @Args('orderId', { type: () => ID }) orderId: number,
    @Args('driverId', { type: () => ID }) driverId: number,
  ): Promise<TaxiOrderDTOV2> {
    await this.sharedOrderService.assignOrderToDriver(orderId, driverId);
    let order = await this.orderService.getTaxiOrder(orderId.toString());
    return order;
  }
}
