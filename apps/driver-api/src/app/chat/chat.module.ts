import { Module } from '@nestjs/common';
import { FirebaseNotificationModule } from '@ridy/database';

import { ChatResolver } from './chat.resolver';
import { ChatService } from './chat.service';
import { RedisHelpersModule } from '@ridy/database';

@Module({
  imports: [RedisHelpersModule, FirebaseNotificationModule.register()],
  providers: [ChatResolver, ChatService],
})
export class ChatModule {}
