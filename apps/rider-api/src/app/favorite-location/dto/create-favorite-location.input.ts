import { InputType, Field } from '@nestjs/graphql';
import { Point } from '@ridy/database';
import { RiderAddressType } from '@ridy/database';
import { PhoneNumberDTO } from '@ridy/database';

@InputType()
export class CreateRiderAddressInput {
  @Field(() => String, { nullable: false })
  title!: string;
  @Field(() => String, { nullable: false })
  details!: string;
  @Field(() => Point, { nullable: false })
  location!: Point;
  @Field(() => RiderAddressType, { nullable: false })
  type!: RiderAddressType;
  @Field(() => PhoneNumberDTO, { nullable: false })
  phoneNumber!: PhoneNumberDTO;
}
