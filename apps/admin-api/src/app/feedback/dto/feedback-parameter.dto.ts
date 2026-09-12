import { ID, ObjectType } from '@nestjs/graphql';
import {
  FilterableField,
  IDField,
  OffsetConnection,
} from '@ptc-org/nestjs-query-graphql';

@ObjectType('FeedbackParameter')
@OffsetConnection('feedbacks', () => FeedbackParameterDTO, {
  enableAggregate: true,
})
export class FeedbackParameterDTO {
  @IDField(() => ID)
  id: number;
  @FilterableField()
  title: string;
  @FilterableField()
  isGood: boolean;
}
