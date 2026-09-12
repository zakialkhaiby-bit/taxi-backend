import { Args, CONTEXT, Mutation, Resolver, Query } from '@nestjs/graphql';
import { DriverStatus, Point } from '@ridy/database';
import { DriverService } from './driver.service';
import { Inject, UseGuards } from '@nestjs/common';
import { GqlAuthGuard, GqlOptionalAuthGuard } from '../auth/jwt-gql-auth.guard';
import { UserContext } from '../auth/authenticated-user';
import { DriverPerformanceDTO } from './dto/driver-performance.dto';
import { DriverDTO } from '../core/dtos/driver.dto';
import { UpdateDriverOfferFilterInput } from './inputs/update-driver-offer-filter.input';
import { ServiceDTO } from '../core/dtos/service.dto';

@Resolver()
export class DriverResolver {
  constructor(
    @Inject(CONTEXT) private context: UserContext,
    private driverService: DriverService,
  ) {}

  @Query(() => DriverDTO)
  @UseGuards(GqlOptionalAuthGuard)
  async me(): Promise<DriverDTO> {
    const userId = this.context.req?.user?.id;
    if (userId) {
      try {
        return await this.driverService.getDriver(userId);
      } catch (e) {}
    }
    return {
      id: 0,
      firstName: '',
      lastName: '',
      profileImageUrl: '',
      mobileNumber: '',
      status: DriverStatus.WaitingDocuments,
      walletCredit: 0,
      currency: 'USD',
      searchDistance: null,
    };
  }

  @Mutation(() => Boolean)
  @UseGuards(GqlAuthGuard)
  async goOnline(
    @Args('location', { type: () => Point }) location: Point,
  ): Promise<boolean> {
    return this.driverService.goOnline(this.context.req.user.id, location);
  }

  @Mutation(() => Boolean)
  @UseGuards(GqlAuthGuard)
  async goOffline(): Promise<boolean> {
    return this.driverService.goOffline(this.context.req.user.id);
  }

  @Query(() => DriverPerformanceDTO)
  @UseGuards(GqlAuthGuard)
  async driverPerformance(): Promise<DriverPerformanceDTO> {
    return this.driverService.getPerformance(this.context.req.user.id);
  }

  @Mutation(() => DriverDTO)
  @UseGuards(GqlAuthGuard)
  async updateDriverOfferFilter(
    @Args('input') input: UpdateDriverOfferFilterInput,
  ): Promise<DriverDTO> {
    return this.driverService.updateDriverOfferFilter(
      this.context.req.user.id,
      input,
    );
  }

  @Mutation(() => Boolean)
  @UseGuards(GqlAuthGuard)
  async updateDriverLocation(
    @Args('point', { type: () => Point }) point: Point,
  ): Promise<void> {
    this.driverService.updateDriverLocation(this.context.req.user.id, point);
  }

  @Query(() => [ServiceDTO])
  @UseGuards(GqlAuthGuard)
  async activeServices(): Promise<ServiceDTO[]> {
    return this.driverService.getActiveServices(this.context.req.user.id);
  }
}
