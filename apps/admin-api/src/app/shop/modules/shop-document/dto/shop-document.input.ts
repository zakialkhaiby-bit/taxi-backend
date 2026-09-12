import { Field, InputType, Int } from '@nestjs/graphql';

@InputType()
export class ShopDocumentInput {
  @Field(() => String, { nullable: false })
  title: string;
  @Field(() => Boolean, { nullable: false })
  isEnabled: boolean;
  @Field(() => Boolean, { nullable: false })
  isRequired: boolean;
  @Field(() => Boolean, { nullable: false })
  hasExpiryDate: boolean;
  @Field(() => Int)
  notificationDaysBeforeExpiry: number;
}
