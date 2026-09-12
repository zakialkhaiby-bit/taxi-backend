import { Module } from '@nestjs/common';
import { RedisHelpersModule } from '@ridy/database';
import { EphemeralMessagesService } from './ephemeral-messages.service';
import { EphemeralMessagesResolver } from './ephemeral-messages.resolver';
import { OrderModule } from '../order/order.module';

@Module({
  imports: [RedisHelpersModule, OrderModule],
  providers: [EphemeralMessagesService, EphemeralMessagesResolver],
})
export class EphemeralMessagesModule {}
