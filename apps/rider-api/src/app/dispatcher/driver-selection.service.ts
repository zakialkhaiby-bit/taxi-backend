import { Injectable, Logger } from '@nestjs/common';
import {
  DispatchConfig,
  DriverRedisService,
  RideOfferRedisService,
  Point,
  RadiusExpansionConfig,
  DriverRedisSnapshot,
} from '@ridy/database';
import { calculateHaversineDistance } from './driver-profile.service';

@Injectable()
export class DriverSelectionService {
  constructor(
    private readonly rideOfferRedisService: RideOfferRedisService,
    private readonly orderRedisService: RideOfferRedisService,
    private readonly driverRedisService: DriverRedisService,
  ) {}

  logger = new Logger(DriverSelectionService.name);

  async getRankedDrivers(input: {
    orderId: number;
    config: DispatchConfig;
  }): Promise<number[]> {
    const { orderId, config } = input;
    this.logger.debug(`Getting ranked drivers for order ${orderId}`);

    const existingCandidates =
      await this.rideOfferRedisService.getOrderCandidates(input.orderId);
    const orderMetadata = await this.orderRedisService.getRideOfferMetadata(
      input.orderId,
    );

    if (existingCandidates.length > 0) {
      this.logger.debug(
        `Found ${existingCandidates.length} existing candidates for order ${orderId}`,
      );
      return existingCandidates.map((driver) => driver.driverId);
    }
    this.logger.debug(orderMetadata);

    let drivers = await this.driverRedisService.getSuitableDriversForOrder({
      point: orderMetadata!.pickupLocation,
      distance: config.maxSearchRadiusMeters,
      serviceId: orderMetadata!.serviceId,
      maxCount: 30,
    });
    this.logger.debug(
      `Found ${drivers.length} drivers within ${config.maxSearchRadiusMeters}m for order ${orderId}`,
    );

    const scoredDrivers = this.applyScoring(
      orderMetadata!.pickupLocation,
      drivers,
      config.scoring,
    );
    this.logger.debug(
      `Scored ${scoredDrivers.length} drivers for order ${orderId}`,
    );

    if (config.radiusExpansion?.enabled) {
      drivers = this.applyRadiusExpansion(
        scoredDrivers,
        config.radiusExpansion,
      );
      this.logger.debug(
        `Applied radius expansion, ${drivers.length} drivers remaining for order ${orderId}`,
      );
    }

    await this.rideOfferRedisService.addOrderCandidates(
      orderId,
      scoredDrivers.map((d) => {
        const distance = calculateHaversineDistance(
          orderMetadata!.pickupLocation,
          d.location,
        );
        return {
          driverId: d.id,
          distance: distance,
          rejectedAt: undefined,
          score: d.score,
        };
      }),
    );
    this.logger.debug(
      `Added ${scoredDrivers.length} order candidates for order ${orderId}`,
    );

    return scoredDrivers.map((d) => d.id);
  }

  private applyScoring(
    pickupLocation: Point,
    drivers: DriverRedisSnapshot[],
    scoring?: DispatchConfig['scoring'],
  ): (DriverRedisSnapshot & { score: number })[] {
    if (!scoring) return drivers.map((d) => ({ ...d, score: 0 }));

    const now = Date.now();

    // helper transforms
    const invDist = (m: number, k: number) => 1 / (1 + m / Math.max(k, 1)); // k≈1000m: 0–1, closer→higher
    const clamp01 = (x: number) => Math.max(0, Math.min(1, x));

    const rated = drivers.map((driver) => {
      const distM = calculateHaversineDistance(driver.location, pickupLocation); // meters
      const rating = driver.rating ?? 0; // assume 0–5
      const totalOrders =
        driver.acceptedOrdersCount + driver.rejectedOrdersCount;
      const cancelRate =
        totalOrders > 0 ? driver.rejectedOrdersCount / totalOrders : 0; // 0–1
      const idleMin = Math.max(
        0,
        (now - new Date(driver.idleStart).getTime()) / 60000,
      );

      // Normalize features to ~0–1 so weights are comparable
      const distScore = invDist(distM, 1000); // closer → higher
      const ratingScore = clamp01(rating / 100); // 0–1
      const idleScore = clamp01(idleMin / 30); // capped, longer idle → higher
      const cancelScore = 1 - clamp01(cancelRate); // lower cancel → higher

      const score =
        (scoring.distanceWeight ?? 1) * distScore +
        (scoring.driverRatingWeight ?? 1) * ratingScore +
        (scoring.idleTimeWeight ?? 1) * idleScore +
        (scoring.cancelRateWeight ?? 1) * cancelScore;

      Logger.log(
        `Driver ${driver.id} | dist=${distM.toFixed(0)}m (s=${distScore.toFixed(2)}), ` +
          `rating=${rating} (s=${ratingScore.toFixed(2)}), idle=${idleMin.toFixed(1)}m (s=${idleScore.toFixed(2)}), ` +
          `cancel=${(cancelRate * 100).toFixed(0)}% (s=${cancelScore.toFixed(2)}) → score=${score.toFixed(3)}`,
      );

      return { ...driver, score };
    });

    let scored = rated
      .filter((d) => !scoring.threshold || d.score >= scoring.threshold)
      .sort((a, b) => b.score - a.score);

    if (scoring.topN) scored = scored.slice(0, scoring.topN);
    return scored;
  }

  private applyRadiusExpansion(
    drivers: (DriverRedisSnapshot & { score: number })[],
    radius: RadiusExpansionConfig,
  ): (DriverRedisSnapshot & { score: number })[] {
    // implement H3 filtering or simple distance filter here if needed
    return drivers; // placeholder
  }
}
