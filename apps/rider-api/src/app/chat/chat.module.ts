import { Module } from '@nestjs/common';
import { PubSubModule, RedisHelpersModule } from '@ridy/database';
import { FirebaseNotificationModule } from '@ridy/database';

import { OrderModule } from '../order/order.module';
import { ChatService } from './chat.service';
import { ChatResolver } from './chat.resolver';

@Module({
  imports: [
    PubSubModule,
    OrderModule,
    FirebaseNotificationModule.register(),
    RedisHelpersModule,
  ],
  providers: [ChatResolver, ChatService],
})
export class ChatModule {}
