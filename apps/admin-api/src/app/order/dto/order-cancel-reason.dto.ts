import {
  Authorize,
  IDField,
  OffsetConnection,
} from '@ptc-org/nestjs-query-graphql';
import { Field, ID, ObjectType } from '@nestjs/graphql';
import { AnnouncementUserType } from '@ridy/database';
import { ServiceAuthorizer } from '../../service/dto/service.authorizer';
import { TaxiOrderDTO } from './order.dto';

@ObjectType('OrderCancelReason')
@Authorize(ServiceAuthorizer)
@OffsetConnection('orders', () => TaxiOrderDTO, { enableAggregate: true })
export class OrderCancelReasonDTO {
  @IDField(() => ID)
  id!: number;
  @Field()
  title!: string;
  @Field()
  isEnabled!: boolean;
  @Field(() => AnnouncementUserType)
  userType!: AnnouncementUserType;
}
