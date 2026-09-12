import { Module } from '@nestjs/common';
import { ComplaintResolver } from './complaint.resolver';
import { ComplaintService } from './complaint.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  OperatorEntity,
  PubSubModule,
  TaxiOrderEntity,
  TaxiSupportRequestEntity,
} from '@ridy/database';

@Module({
  imports: [
    PubSubModule,
    TypeOrmModule.forFeature([
      TaxiSupportRequestEntity,
      TaxiOrderEntity,
      OperatorEntity,
    ]),
  ],
  providers: [ComplaintResolver, ComplaintService],
})
export class ComplaintModule {}
