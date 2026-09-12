import { Inject, Injectable, Logger } from '@nestjs/common';
import { Args, Context, ID, Int, Subscription } from '@nestjs/graphql';
import { DriverRedisSnapshot, PUBSUB, PubSubPort } from '@ridy/database';
import { plainToInstance } from 'class-transformer';
import { DriverLocationUpdateDTO } from './dto/driver-location-update.dto';
import { ClusteredLocationDTO } from './dto/clustered-location.dto';

@Injectable()
export class DriverSubscriptionService {
  constructor(
    @Inject(PUBSUB)
    private readonly pubsub: PubSubPort,
  ) {}

  @Subscription(() => [ClusteredLocationDTO], {
    filter: (
      payload,
      variables: {
        h3Resolution: number;
        h3IndexIds: string[];
      },
      context,
    ) => {
      // if any of the h3IndexIds match the payload's updated clusters
      return variables.h3IndexIds.some((h3IndexId) =>
        payload.updatedClusters.some(
          (cluster) => cluster.h3Index === h3IndexId,
        ),
      );
    },
    resolve: (payload: { updatedClusters: ClusteredLocationDTO[] }) => {
      return payload.updatedClusters;
    },
  })
  driverLocationClusterUpdate(
    @Context() context: any,
    @Args('h3Resolution', { type: () => Int }) h3Resolution: number,
    @Args('h3IndexIds', { type: () => [String] }) h3IndexIds: string[],
  ): AsyncIterator<ClusteredLocationDTO[]> {
    return this.pubsub.asyncIterator('admin.driver-location.updated');
  }

  @Subscription(() => DriverLocationUpdateDTO, {
    filter: (
      payload: {
        driverLocationUpdated: DriverRedisSnapshot;
      },
      variables: {
        driverIds: number[];
      },
      context,
    ) => {
      Logger.debug(
        `Filtering driverLocationUpdated for driverIds: ${variables.driverIds}`,
      );
      Logger.debug(`Payload driverId: ${payload.driverLocationUpdated.id}`);
      const includes = variables.driverIds
        .map((id) => String(id))
        .includes(payload.driverLocationUpdated.id);
      Logger.debug(`Includes: ${includes}`);
      return includes;
    },
    resolve: (payload: {
      driverLocationUpdated: DriverRedisSnapshot;
    }): DriverLocationUpdateDTO => {
      return plainToInstance(DriverLocationUpdateDTO, {
        driverId: payload.driverLocationUpdated.id,
        point: payload.driverLocationUpdated.location,
        orderIds: [],
        lastUpdatedAt: new Date(payload.driverLocationUpdated.locationTime),
      });
    },
  })
  driverLocationUpdated(
    @Args('driverIds', { type: () => [ID] }) driverIds: number[],
  ): AsyncIterator<DriverLocationUpdateDTO> {
    return this.pubsub.asyncIterator('driverLocationUpdated');
  }
}
