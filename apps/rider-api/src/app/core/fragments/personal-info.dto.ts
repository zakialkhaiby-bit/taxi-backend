import { InputType, ObjectType, Field } from '@nestjs/graphql';
import { Gender } from '@ridy/database';
import { PhoneNumberDTO } from '@ridy/database';

@ObjectType('PersonalInfo')
@InputType('PersonalInfoInput')
export class PersonalInfoDTO {
  @Field(() => String, { nullable: true })
  firstName?: string;
  @Field(() => String, { nullable: true })
  lastName?: string;
  @Field(() => String, { nullable: true })
  email?: string;
  @Field(() => PhoneNumberDTO, { nullable: true })
  mobileNumber?: PhoneNumberDTO;
  @Field(() => Gender, { nullable: true })
  gender?: Gender;
  @Field(() => String, { nullable: true })
  address?: string;
}
