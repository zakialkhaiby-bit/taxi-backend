import {
  Args,
  CONTEXT,
  Float,
  ID,
  Mutation,
  Query,
  Resolver,
} from '@nestjs/graphql';
import { OrderService } from './order.service';
import { TaxiOrderNoteDTO } from './dto/taxi-order-note.dto';
import { CreateTaxiOrderNoteInput } from './dto/create-taxi-order-note.input';
import { Inject, UseGuards } from '@nestjs/common';
import type { UserContext } from '../auth/authenticated-admin';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { TaxiOrderConnectionDTO, TaxiOrderDTOV2 } from './dto/taxi-order.dto';
import { PaginationInput } from '../core/dtos/pagination.input';
import { TaxiOrderFilterInput } from './inputs/taxi-order-filter.input';
import { TaxiOrderSortInput } from './inputs/taxi-order-sort.input';

@Resolver()
@UseGuards(JwtAuthGuard)
export class OrderResolver {
  constructor(
    private orderService: OrderService,
    @Inject(CONTEXT)
    private context: UserContext,
  ) {}

  @Mutation(() => TaxiOrderNoteDTO)
  async createTaxiOrderNote(
    @Args('input', { type: () => CreateTaxiOrderNoteInput })
    input: CreateTaxiOrderNoteInput,
  ): Promise<TaxiOrderNoteDTO> {
    return await this.orderService.createTaxiOrderNote({
      ...input,
      staffId: this.context.req.user.id,
    });
  }

  @Query(() => Float, { nullable: true })
  async taxiOrderSuccessRate(
    @Args('startTime', { type: () => Date, nullable: true }) startTime?: Date,
    @Args('endTime', { type: () => Date, nullable: true }) endTime?: Date,
  ): Promise<number | null> {
    return this.orderService.getTaxiOrderSuccessRate({
      startTime,
      endTime,
    });
  }

  @Query(() => TaxiOrderConnectionDTO)
  async taxiOrders(
    @Args('paging', { type: () => PaginationInput, nullable: true })
    paging: PaginationInput,
    @Args('filter', { type: () => TaxiOrderFilterInput, nullable: true })
    filter: TaxiOrderFilterInput,
    @Args('sorting', { type: () => TaxiOrderSortInput, nullable: true })
    sorting: TaxiOrderSortInput,
  ): Promise<TaxiOrderConnectionDTO> {
    return this.orderService.getTaxiOrders({
      paging,
      filter,
      sorting,
    });
  }

  @Query(() => TaxiOrderDTOV2)
  async taxiOrder(
    @Args('id', { type: () => ID }) id: string,
  ): Promise<TaxiOrderDTOV2 | null> {
    return this.orderService.getTaxiOrder(id);
  }
}
