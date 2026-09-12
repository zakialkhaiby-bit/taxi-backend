import { Field, Int, ObjectType } from '@nestjs/graphql';
import { Point } from '@ridy/database';

@ObjectType('ClusteredLocation')
export class ClusteredLocationDTO {
  @Field(() => String, { nullable: false })
  h3Index!: string;
  @Field(() => Point, { nullable: false })
  location: Point;
  @Field(() => Int, { nullable: false })
  count: number;
}
