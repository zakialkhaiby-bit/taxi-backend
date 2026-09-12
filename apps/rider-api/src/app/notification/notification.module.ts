import { Module } from '@nestjs/common';
import { NotificationService } from './notification.service';
import { NotificationResolver } from './notification.resolver';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  CustomerEntity,
  CustomerSessionEntity,
  PubSubModule,
} from '@ridy/database';

@Module({
  imports: [
    PubSubModule,
    TypeOrmModule.forFeature([CustomerEntity, CustomerSessionEntity]),
  ],
  providers: [NotificationService, NotificationResolver],
  exports: [],
})
export class NotificationModule {}
