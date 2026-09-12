import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FeedbackParameterEntity } from '@ridy/database';
import { Repository } from 'typeorm';
import { FeedbackParameterDTO } from './dto/feedback-parameter.dto';

@Injectable()
export class FeedbackService {
  constructor(
    @InjectRepository(FeedbackParameterEntity)
    private readonly feedbackParameterRepository: Repository<FeedbackParameterEntity>,
  ) {}

  async getFeedbackParameters(): Promise<FeedbackParameterDTO[]> {
    const feedbackParameters = await this.feedbackParameterRepository.find();
    return feedbackParameters;
  }
}
