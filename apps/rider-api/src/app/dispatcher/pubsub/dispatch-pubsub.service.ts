import { Injectable } from '@nestjs/common';
import {
  DispatchConfig,
  RideOfferRedisService,
  RideOfferDTO,
  PubSubService,
  DriverEventType,
  DriverNotificationService,
  DriverRedisService,
} from '@ridy/database';

@Injectable()
export class DispatchPubSubService {
  constructor(
    private readonly pubsubService: PubSubService,
    private readonly orderRedisService: RideOfferRedisService,
    private readonly driverNotificationService: DriverNotificationService,
    private readonly driverRedisService: DriverRedisService,
  ) {}

  /**
   * Broadcast mode: Notify multiple drivers at once
   */
  async broadcastOrder(
    orderId: number,
    driverIds: number[],
    expireInSeconds: number,
  ) {
    const order = await this.buildOrderPayload(orderId);
    await this.orderRedisService.offerRide({
      orderId: orderId.toString(),
      driverIds: driverIds.map((id) => id.toString()),
      offerExpiresAt: new Date(Date.now() + expireInSeconds * 1000),
    });

    for (const driverId of driverIds) {
      const driver = await this.driverRedisService.getOnlineDriverMetaData(
        driverId.toString(),
      );
      this.driverNotificationService.requests(driver?.fcmTokens || []);
      this.pubsubService.publish(
        'driver.event',
        {
          driverId,
        },
        {
          type: DriverEventType.RideOfferReceived,
          rideOffer: order,
          driverId: driverId,
          orderId: orderId,
        },
      );
    }
  }

  /**
   * Sequential mode: Notify one driver at a time per attempt
   */
  async sequentialDispatch(
    orderId: number,
    driverIds: number[],
    config: DispatchConfig,
    currentCandidateIndex: number,
  ) {
    if (driverIds.length === 0) return;

    const driverId = driverIds[currentCandidateIndex];
    const previousDriverIndex =
      (currentCandidateIndex - 1 + driverIds.length) % driverIds.length;
    const previousDriverId = driverIds[previousDriverIndex];
    // if (previousDriverId === driverId) return; // Only one driver in the list but we can't skip offering to them for the first time

    await this.orderRedisService.removeRideOfferFromDriverOffers({
      orderId: orderId.toString(),
      driverIds: [previousDriverId.toString()],
    });
    await this.pubsubService.publish(
      'driver.event',
      {
        driverId: previousDriverId,
      },
      {
        type: DriverEventType.RideOfferRevoked,
        orderId,
        driverId: previousDriverId,
      },
    );

    await this.orderRedisService.offerRide({
      orderId: orderId.toString(),
      driverIds: [driverId.toString()],
      offerExpiresAt: new Date(
        Date.now() +
          (config.sequentialConfig?.perDriverTimeoutSeconds ?? 30) * 1000,
      ),
    });
    await this.pubsubService.publish(
      'driver.event',
      {
        driverId: driverId,
      },
      {
        type: DriverEventType.RideOfferReceived,
        rideOffer: await this.buildOrderPayload(orderId),
        driverId: driverId,
        orderId: orderId,
      },
    );
  }

  /**
   * Helper to shape order payload sent to the client
   */
  private async buildOrderPayload(orderId: number): Promise<RideOfferDTO> {
    return this.orderRedisService.getRideOfferMetadataAsRideOffer(
      orderId.toString(),
    );
  }
}
