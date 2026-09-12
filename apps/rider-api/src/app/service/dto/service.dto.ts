import { Field, ID, Int, ObjectType, Float } from '@nestjs/graphql';
import { ServicePaymentMethod } from '@ridy/database';
import { MediaDTO } from '../../upload/media.dto';
import { ServiceOptionDTO } from './service-option.dto';

@ObjectType('Service')
export class ServiceDTO {
  @Field(() => ID)
  id!: number;
  @Field(() => String, { nullable: false })
  name!: string;
  @Field(() => String, { nullable: true })
  description?: string;
  @Field(() => Int, { nullable: true })
  personCapacity?: number;
  @Field(() => ServicePaymentMethod, { nullable: false })
  paymentMethod!: ServicePaymentMethod;
  @Field(() => Float, { nullable: false })
  cost!: number;
  @Field(() => Float, { nullable: true })
  costAfterCoupon?: number;
  @Field(() => Float, { nullable: false })
  cancellationTotalFee!: number;
  @Field(() => Int, { nullable: false })
  prepayPercent!: number;
  @Field(() => Boolean, { nullable: false })
  twoWayAvailable!: boolean;
  @Field(() => MediaDTO, { nullable: false })
  media!: MediaDTO;
  @Field(() => [ServiceOptionDTO], { nullable: false })
  options!: ServiceOptionDTO[];
}
