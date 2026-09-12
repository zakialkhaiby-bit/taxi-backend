import { Args, CONTEXT, Mutation, Query, Resolver } from '@nestjs/graphql';
import { RiderService } from './rider.service';
import { RiderStatisticsDTO } from './dto/rider-statistics.dto';
import { UserContext } from '../auth/authenticated-user';
import { Inject, UseGuards } from '@nestjs/common';
import { RiderDTO } from './dto/rider.dto';
import { UpdateRiderInput } from './dto/update-rider.input';
import { GqlAuthGuard } from '../auth/access-token.guard';

@Resolver()
@UseGuards(GqlAuthGuard)
export class RiderResolver {
  constructor(
    private readonly riderService: RiderService,
    @Inject(CONTEXT) private readonly context: UserContext,
  ) {}

  @Query(() => RiderDTO)
  async me(): Promise<RiderDTO> {
    return this.riderService.getRiderProfile(this.context.req.user.id);
  }

  @Query(() => RiderStatisticsDTO)
  async myStatistics(): Promise<RiderStatisticsDTO> {
    return this.riderService.getRiderStatistics(this.context.req.user.id);
  }

  @Mutation(() => RiderDTO)
  async updateProfile(
    @Args('input') input: UpdateRiderInput,
  ): Promise<RiderDTO> {
    return this.riderService.updateRiderProfile(
      this.context.req.user.id,
      input,
    );
  }
}
