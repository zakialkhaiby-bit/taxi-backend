import { InjectQueue } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import { Queue } from 'bullmq';
import { BetterConfigService } from '@ridy/database';

@Injectable()
export class DispatchService {
  constructor(
    @InjectQueue('dispatch-main') private readonly dispatchMainQueue: Queue,
    @InjectQueue('dispatch-broadcast')
    private readonly broadcastDispatchQueue: Queue,
    @InjectQueue('dispatch-sequential')
    private readonly sequentialDispatchQueue: Queue,
    private readonly configService: BetterConfigService,
  ) {}

  // async dispatch(orderId: number) {
  //   const config = this.configService.getDispatchConfig();
  //   await this.dispatchMainQueue.add('init-dispatch', { orderId, config });
  // }

  async expireOrder(orderId: number) {
    this.dispatchMainQueue.remove(`dispatch:${orderId}`);
    this.dispatchMainQueue.remove(`expire:${orderId}`);
    this.broadcastDispatchQueue.remove(`dispatch:${orderId}`);
    this.sequentialDispatchQueue.remove(`dispatch:${orderId}`);
  }
}
