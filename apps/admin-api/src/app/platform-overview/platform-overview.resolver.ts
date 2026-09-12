import { Args, Query, Resolver } from '@nestjs/graphql';
import { PlatformKPI } from './dtos/platform-kpi.dto';
import { PlatformOverviewService } from './platform-overview.service';
import { KPIPeriod, PlatformKPIInput } from './inputs/platform-kpi.input';
import { UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { OrderVolumeTimeSeries } from './dtos/order-volume-time-series.dto';

@Resolver()
@UseGuards(JwtAuthGuard)
export class PlatformOverviewResolver {
  constructor(private platformOverviewService: PlatformOverviewService) {}

  @Query(() => PlatformKPI)
  async platformKPI(
    @Args('input', { type: () => PlatformKPIInput }) input: PlatformKPIInput,
  ): Promise<PlatformKPI> {
    return this.platformOverviewService.platformKPI(input);
  }

  @Query(() => [OrderVolumeTimeSeries])
  orderVolumeTimeSeries(
    @Args('period', { type: () => KPIPeriod }) period: KPIPeriod,
  ): Promise<OrderVolumeTimeSeries[]> {
    return this.platformOverviewService.getOrderVolumeTimeSeries(period);
  }
}
