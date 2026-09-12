import { InputType, Field, Int } from '@nestjs/graphql';
import { Point } from '@ridy/database';

@InputType('BoundsInput')
export class BoundsInput {
  @Field(() => Point, { nullable: false })
  northEast!: Point;
  @Field(() => Point, { nullable: false })
  southWest!: Point;
  @Field(() => Int, { nullable: true })
  zoom?: number;
}
