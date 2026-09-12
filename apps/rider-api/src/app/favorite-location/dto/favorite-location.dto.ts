import { ID, ObjectType, Field } from '@nestjs/graphql';
import { Point } from '@ridy/database';
import { RiderAddressType } from '@ridy/database';
import { PhoneNumberDTO } from '@ridy/database';

@ObjectType('FavoriteLocation')
export class FavoriteLocationDTO {
  @Field(() => ID)
  id!: number;
  @Field(() => RiderAddressType, { nullable: false })
  type!: RiderAddressType;
  @Field(() => String, { nullable: false })
  title!: string;
  @Field(() => String, { nullable: false })
  details!: string;
  @Field(() => Point, { nullable: false })
  location!: Point;
  @Field(() => PhoneNumberDTO, { nullable: true })
  phoneNumber?: PhoneNumberDTO;
}
