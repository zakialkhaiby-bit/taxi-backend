import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OperatorEntity, PubSubModule } from '@ridy/database';
import { SOSEntity } from '@ridy/database';
import { SOSResolver } from './sos.resolver';
import { SOSService } from './sos.service';

@Module({
  imports: [
    PubSubModule,
    TypeOrmModule.forFeature([SOSEntity, OperatorEntity]),
  ],
  providers: [SOSService, SOSResolver],
})
export class SOSModule {}
