import { InjectQueue, Processor, WorkerHost } from '@nestjs/bullmq';
import { Queue, Job } from 'bullmq';
import { DispatchConfig } from '@ridy/database';
import { DispatchPubSubService } from '../pubsub/dispatch-pubsub.service';
import { DriverSelectionService } from '../driver-selection.service';
import { Logger } from '@nestjs/common';

@Processor('dispatch-broadcast')
export class BroadcastConsumer extends WorkerHost {
  constructor(
    private readonly pubsub: DispatchPubSubService,
    @InjectQueue('dispatch-broadcast')
    private readonly attemptQueue: Queue<BroadcastDispatchJobData>,
    private readonly driverSelectionService: DriverSelectionService,
  ) {
    super();
  }

  async process(job: Job<BroadcastDispatchJobData, any, string>) {
    const { orderId, config, wave } = job.data;

    Logger.debug(
      `Processing broadcast dispatch job for order ${orderId}, wave: ${wave}`,
      'BroadcastConsumer',
    );

    const drivers = await this.driverSelectionService.getRankedDrivers({
      orderId,
      config,
    });

    Logger.debug(
      `Found ${drivers.length} drivers for order ${orderId}`,
      'BroadcastConsumer',
    );

    this.pubsub.broadcastOrder(orderId, drivers, config.requestTimeoutSeconds);

    if (
      !config.broadcastConfig?.waveIntervalSeconds &&
      wave < (config.broadcastConfig?.maxWaves || 1)
    ) {
      Logger.debug(
        `Scheduling wave ${wave + 1} for order ${orderId} with delay ${config.broadcastConfig!.waveIntervalSeconds * 1000}ms`,
        'BroadcastConsumer',
      );
      this.attemptQueue.add(
        'dispatch',
        { orderId, config, wave: wave + 1 },
        {
          delay: config.broadcastConfig!.waveIntervalSeconds * 1000,
          jobId: `dispatch:${orderId}:wave:${wave + 1}`,
        },
      );
    }

    // if (
    //   config.radiusExpansion?.enabled &&
    //   retryCount < config.radiusExpansion.maxSteps
    // ) {
    //   Logger.debug(
    //     `Scheduling retry ${retryCount + 1} for order ${orderId} with delay ${config.radiusExpansion.stepMeters * 1000}ms`,
    //     'BroadcastConsumer',
    //   );

    //   this.attemptQueue.add(
    //     'dispatch',
    //     { orderId, config, wave: 1 },
    //     { delay: config.radiusExpansion.stepMeters * 1000 },
    //   );
    // } else {
    //   Logger.debug(`Invalidating order ${orderId} after broadcast dispatch`);
    // }
  }
}
export class BroadcastDispatchJobData {
  orderId!: number;
  config!: DispatchConfig;
  wave!: number;
}
