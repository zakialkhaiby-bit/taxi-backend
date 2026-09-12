import { Field, InputType } from '@nestjs/graphql';
import { Gender } from '@ridy/database';

@InputType()
export class UpdateRiderInput {
  @Field(() => String, { nullable: true })
  firstName?: string;
  @Field(() => String, { nullable: true })
  lastName?: string;
  @Field(() => Gender, { nullable: true })
  gender?: Gender;
  @Field(() => String, { nullable: true })
  email?: string;
}
