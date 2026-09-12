import { InjectQueue, Processor, WorkerHost } from '@nestjs/bullmq';
import { Job, Queue } from 'bullmq';
import {
  BetterConfigService,
  DispatchStrategy,
  DriverEventType,
  PubSubService,
  RideOfferRedisService,
} from '@ridy/database';
import { Injectable, Logger } from '@nestjs/common';
import { SequentialDispatchJobData } from './sequential.processor';
import { BroadcastDispatchJobData } from './broadcast.processor';

@Injectable()
@Processor('dispatch-main')
export class MainConsumer extends WorkerHost {
  private readonly logger = new Logger(MainConsumer.name);
  constructor(
    @InjectQueue('dispatch-main')
    private readonly mainQueue: Queue<DispatchMainJobData>,
    @InjectQueue('dispatch-sequential')
    private readonly sequentialDispatchQueue: Queue<SequentialDispatchJobData>,
    @InjectQueue('dispatch-broadcast')
    private readonly broadcastDispatchQueue: Queue<BroadcastDispatchJobData>,
    private readonly configService: BetterConfigService,

    private readonly pubsub: PubSubService,
    private readonly orderRedisService: RideOfferRedisService,
  ) {
    super();
  }

  async process(job: Job<DispatchMainJobData>) {
    const { orderId } = job.data;
    switch (job.name) {
      case 'dispatch':
        return this.dispatchOrder(job);
      case `expire-order`:
        this.logger.debug(`Expiring order ${job.id} after timeout`);
        return this.expireOrder(orderId);
      default:
        this.logger.warn(`Unknown job type: ${job.name}`);
        return { orderId };
    }
  }
  async expireOrder(orderId: number) {
    const orderMetaData = await this.orderRedisService.getRideOfferMetadata(
      orderId.toString(),
    );
    this.orderRedisService.rideOfferExpired({
      orderId: orderId.toString(),
    });
    for (const driverId of orderMetaData?.offeredToDriverIds || []) {
      this.pubsub.publish(
        'driver.event',
        {
          driverId: parseInt(driverId),
        },
        {
          type: DriverEventType.RideOfferRevoked,
          orderId,
          driverId: parseInt(driverId),
        },
      );
    }
  }

  async dispatchOrder(job: Job<DispatchMainJobData>) {
    const { orderId } = job.data;
    const config = await this.configService.getDispatchConfig();

    this.logger.debug(
      `Processing dispatch job for order ${orderId} with strategy ${config.strategy}`,
    );

    switch (config.strategy) {
      case DispatchStrategy.Broadcast:
        this.logger.debug(`Adding broadcast dispatch job for order ${orderId}`);
        this.broadcastDispatchQueue.add(
          'dispatch',
          {
            orderId,
            config,
            wave: 1,
          },
          {
            jobId: `dispatch:${orderId}`,
          },
        );
        break;
      case DispatchStrategy.Sequential:
        this.logger.debug(
          `Adding sequential dispatch job for order ${orderId}`,
        );
        this.sequentialDispatchQueue.add(
          'dispatch',
          {
            orderId,
            config,
            currentCandidateIndex: 0,
            retryCount: 0,
          },
          {
            jobId: `dispatch:${orderId}`,
          },
        );
    }

    this.mainQueue.add(
      `expire-order`,
      { orderId },
      {
        removeOnComplete: true,
        removeOnFail: true,
        delay: config.requestTimeoutSeconds * 1000,
        jobId: `expire:${orderId}`,
      },
    );
  }
}

export interface DispatchMainJobData {
  orderId: number;
}
