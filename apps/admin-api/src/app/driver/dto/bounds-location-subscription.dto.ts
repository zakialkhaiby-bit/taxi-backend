import { Field, ObjectType } from '@nestjs/graphql';
import { ClusteredLocationDTO, IdentifiedLocationDTO } from '@ridy/database';

@ObjectType('BoundsLocationSubscription')
export class BoundsLocationSubscriptionDTO {
  @Field(() => [ClusteredLocationDTO], { nullable: false })
  clusters!: ClusteredLocationDTO[];

  @Field(() => [IdentifiedLocationDTO], { nullable: false })
  singles!: IdentifiedLocationDTO[];
}
