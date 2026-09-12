import { Module } from '@nestjs/common';
import {
  NestjsQueryGraphQLModule,
  PagingStrategies,
} from '@ptc-org/nestjs-query-graphql';
import { NestjsQueryTypeOrmModule } from '@ptc-org/nestjs-query-typeorm';
import {
  AnnouncementEntity,
  SMSModule,
  DriverEntity,
  CustomerEntity,
  FirebaseNotificationModule,
} from '@ridy/database';
import { AnnouncementDTO } from './dto/announcement.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { UpdateAnnouncementInput } from './inputs/update-announcement.input';
import { AnnouncementResolver } from './announcement.resolver';
import { AnnouncementService } from './announcement.service';
import { TypeOrmModule } from '@nestjs/typeorm';

@Module({
  imports: [
    FirebaseNotificationModule.register(),
    TypeOrmModule.forFeature([DriverEntity, CustomerEntity]),
    SMSModule,
    NestjsQueryGraphQLModule.forFeature({
      imports: [NestjsQueryTypeOrmModule.forFeature([AnnouncementEntity])],
      resolvers: [
        {
          EntityClass: AnnouncementEntity,
          DTOClass: AnnouncementDTO,
          UpdateDTOClass: UpdateAnnouncementInput,
          create: { disabled: true },
          update: { many: { disabled: true } },
          delete: { many: { disabled: true } },
          pagingStrategy: PagingStrategies.OFFSET,
          enableTotalCount: true,
          guards: [JwtAuthGuard],
        },
      ],
    }),
  ],
  providers: [AnnouncementService, AnnouncementResolver],
})
export class AnnouncementModule {}
