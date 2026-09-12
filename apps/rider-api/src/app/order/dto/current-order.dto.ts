import { ObjectType, Field } from '@nestjs/graphql';
import { Point } from '@ridy/database';
import { OrderDTO } from './order.dto';

@ObjectType({
  description: 'deprecated: We will use ActiveOrder instead',
})
export class CurrentOrder {
  @Field(() => OrderDTO, { nullable: false })
  order!: OrderDTO;
  @Field(() => Point, { nullable: true })
  driverLocation?: Point;
}
