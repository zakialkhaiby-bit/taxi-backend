import { Module } from '@nestjs/common';
import { DispatchPubSubService } from './pubsub/dispatch-pubsub.service';
import { BullModule } from '@nestjs/bullmq';
import { DispatchService } from './dispatch.service';
import { MainConsumer } from './processor/main.processor';
import {
  BetterConfigModule,
  PubSubModule,
  RedisHelpersModule,
  TaxiOrderEntity,
  redisConnection,
} from '@ridy/database';
import { SequentialConsumer } from './processor/sequential.processor';
import { BroadcastConsumer } from './processor/broadcast.processor';
import { DriverSelectionService } from './driver-selection.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullBoardModule } from '@bull-board/nestjs';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';

@Module({
  imports: [
    PubSubModule,
    TypeOrmModule.forFeature([TaxiOrderEntity]),
    BetterConfigModule,
    RedisHelpersModule,
    BullModule.registerQueue(
      { name: 'dispatch-main', connection: redisConnection() },
      {
        name: 'dispatch-broadcast',
        connection: redisConnection(),
        defaultJobOptions: {
          removeOnComplete: true,
          removeOnFail: { count: 5 },
          attempts: 3,
          backoff: { type: 'fixed', delay: 5000 },
        },
      },
      {
        name: 'dispatch-sequential',
        connection: redisConnection(),
        defaultJobOptions: {
          removeOnComplete: true,
          removeOnFail: { count: 5 },
          attempts: 3,
          backoff: { type: 'fixed', delay: 10000 },
        },
      },
    ),
    BullBoardModule.forFeature(
      { name: 'dispatch-main', adapter: BullMQAdapter },
      { name: 'dispatch-broadcast', adapter: BullMQAdapter },
      { name: 'dispatch-sequential', adapter: BullMQAdapter },
    ),
  ],
  providers: [
    DispatchService,
    DispatchPubSubService,
    SequentialConsumer,
    BroadcastConsumer,
    DriverSelectionService,
    MainConsumer,
  ],
  exports: [DispatchService],
})
export class DispatchModule {}
