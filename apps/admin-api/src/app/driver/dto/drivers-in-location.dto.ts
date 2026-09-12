import { Field, Int, ObjectType } from '@nestjs/graphql';
import { OnlineDriver } from './driver-location.dto';

@ObjectType('DriverInLocation')
export class DriversInLocationDTO {
  @Field(() => [OnlineDriver], { nullable: false })
  drivers!: OnlineDriver[];

  @Field(() => Int, { nullable: false })
  totalCount!: number;
}
