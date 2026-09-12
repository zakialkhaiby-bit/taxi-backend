import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FeedbackParameterEntity } from '@ridy/database';
import { FeedbackService } from './feedback.service';
import { FeedbackResolver } from './feedback.resolver';

@Module({
  imports: [TypeOrmModule.forFeature([FeedbackParameterEntity])],
  providers: [FeedbackService, FeedbackResolver],
})
export class FeedbackModule {}
