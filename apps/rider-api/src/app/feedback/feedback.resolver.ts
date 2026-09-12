import { Resolver, Query } from '@nestjs/graphql';
import { FeedbackParameterDTO } from './dtos/feedback-parameter.dto';
import { FeedbackService } from './feedback.service';

@Resolver()
export class FeedbackResolver {
  constructor(private readonly feedbackService: FeedbackService) {}
  @Query(() => [FeedbackParameterDTO])
  async feedbackParameters(): Promise<FeedbackParameterDTO[]> {
    return this.feedbackService.getFeedbackParameters();
  }
}
