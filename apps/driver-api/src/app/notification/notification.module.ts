import { Module } from '@nestjs/common';
import { NotificationService } from './notification.service';
import { NotificationResolver } from './notification.resolver';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DriverEntity, DriverSessionEntity } from '@ridy/database';

@Module({
  imports: [TypeOrmModule.forFeature([DriverEntity, DriverSessionEntity])],
  providers: [NotificationService, NotificationResolver],
  exports: [],
})
export class NotificationModule {}
