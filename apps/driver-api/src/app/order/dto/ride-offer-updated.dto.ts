import { Field, ID, ObjectType } from '@nestjs/graphql';
import { RideOfferDTO, RideOfferUpdateType } from '@ridy/database';

@ObjectType('RideOfferUpdated')
export class RideOfferUpdatedDTO {
  @Field(() => RideOfferUpdateType)
  type!: RideOfferUpdateType;
  @Field(() => ID)
  orderId!: number;
  @Field(() => RideOfferDTO, { nullable: false })
  rideOffer?: RideOfferDTO;
}
