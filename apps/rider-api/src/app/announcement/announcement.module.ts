import { Module } from '@nestjs/common';

import { AnnouncementService } from './announcement.service';
import { AnnouncementResolver } from './announcement.resolver';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AnnouncementEntity } from '@ridy/database';

@Module({
  imports: [TypeOrmModule.forFeature([AnnouncementEntity])],
  providers: [AnnouncementService, AnnouncementResolver],
})
export class AnnouncementModule {}
