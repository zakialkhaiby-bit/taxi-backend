import { InjectQueue, Processor, WorkerHost } from '@nestjs/bullmq';
import { Queue, Job } from 'bullmq';
import { DispatchConfig, DriverRedisService } from '@ridy/database';
import { DispatchPubSubService } from '../pubsub/dispatch-pubsub.service';
import { DriverSelectionService } from '../driver-selection.service';
import { Logger } from '@nestjs/common';

@Processor('dispatch-sequential')
export class SequentialConsumer extends WorkerHost {
  private readonly logger = new Logger(SequentialConsumer.name);
  constructor(
    private readonly pubsub: DispatchPubSubService,
    @InjectQueue('dispatch-sequential')
    private readonly sequentialDispatchQueue: Queue<SequentialDispatchJobData>,
    private readonly driverSelectionService: DriverSelectionService,
    private readonly driverRedisService: DriverRedisService,
  ) {
    super();
  }

  async process(job: Job<SequentialDispatchJobData, any, string>) {
    const { orderId, config, retryCount, currentCandidateIndex } = job.data;

    this.logger.debug(
      `Processing sequential dispatch job for order ${orderId}, retry count: ${retryCount}`,
    );

    const rankedDriverIds = await this.driverSelectionService.getRankedDrivers({
      orderId,
      config,
    });

    this.logger.debug(
      `Found ${rankedDriverIds.length} drivers for order ${orderId}`,
    );
    const driver = await this.driverRedisService.getOnlineDriverMetaData(
      rankedDriverIds[currentCandidateIndex].toString(),
    );
    if (!driver) {
      this.logger.debug(
        `Driver ${rankedDriverIds[currentCandidateIndex]} is no longer online, skipping`,
      );
      const isLastDriverInList =
        currentCandidateIndex === rankedDriverIds.length - 1;
      await this.sequentialDispatchQueue.add('dispatch', {
        orderId,
        config,
        retryCount: isLastDriverInList ? retryCount + 1 : retryCount,
        currentCandidateIndex: isLastDriverInList
          ? 0
          : currentCandidateIndex + 1,
      });
      return;
    }

    await this.pubsub.sequentialDispatch(
      orderId,
      rankedDriverIds,
      config,
      currentCandidateIndex,
    );
    if (retryCount < (config.sequentialConfig?.driverRetryLimit ?? 3)) {
      const isLastDriverInList =
        currentCandidateIndex === rankedDriverIds.length - 1;
      await this.sequentialDispatchQueue.add(
        'dispatch',
        {
          orderId,
          config,
          retryCount: isLastDriverInList ? retryCount + 1 : retryCount,
          currentCandidateIndex: isLastDriverInList
            ? 0
            : currentCandidateIndex + 1,
        },
        {
          delay:
            (config.sequentialConfig?.perDriverTimeoutSeconds ?? 30) * 1000,
        },
      );
    }

    this.logger.debug(
      `Scheduled next dispatch attempt for order ${orderId} with ${config.sequentialConfig?.perDriverTimeoutSeconds ?? 30}s delay`,
    );
  }
}

export interface SequentialDispatchJobData {
  orderId: number;
  config: DispatchConfig;
  retryCount: number;
  currentCandidateIndex: number;
}
